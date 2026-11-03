export interface StreamChatOptions {
  /** The endpoint URL to POST to */
  url: string;
  /** The prompt / message to send */
  prompt: string;
  /** Optional extra body fields merged into the request payload */
  body?: Record<string, unknown>;
  /** Optional extra headers merged into the request */
  headers?: Record<string, string>;
  /** AbortSignal to cancel the request */
  signal?: AbortSignal;
  /** Characters released per tick (default 2) */
  charsPerTick?: number;
  /** Milliseconds between ticks (default 20). Set to 0 to disable pacing. */
  tickMs?: number;
  /**
   * If true, release faster when the queue backs up (default false).
   * Leave off for a perfectly steady rate, e.g. simulating speech.
   */
  catchUp?: boolean;
}

export interface StreamChatCallbacks {
  /** Called with the raw chunk text as it is released (after pacing) */
  onChunk?: (chunk: string) => void;
  /** Called with the accumulated full text on every update */
  onUpdate?: (fullText: string) => void;
  /** Called once when the stream finishes successfully */
  onComplete?: (fullText: string) => void;
  /** Called if an error occurs (not called on abort) */
  onError?: (error: Error) => void;
}

/**
 * Streams a chat response from an SSE / raw-text endpoint.
 *
 * Incoming text is queued and released at a steady rate (typewriter effect).
 * If the queue backs up, the release rate increases automatically so the UI
 * never falls far behind the network.
 *
 * @returns The full accumulated response text.
 * @throws If the request fails (AbortError is re-thrown for the caller to handle).
 */
export async function streamChat(
  options: StreamChatOptions,
  callbacks: StreamChatCallbacks = {},
): Promise<string> {
  const {
    url,
    prompt,
    body = {},
    headers = {},
    signal,
    charsPerTick = 2,
    tickMs = 20,
    catchUp = false,
  } = options;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ prompt, ...body }),
    signal,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  if (!res.body) throw new Error('Response has no body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let fullText = '';

  // ---- Pacing (typewriter queue) ----
  let queue = '';
  let timer: ReturnType<typeof setInterval> | null = null;
  const drainWaiters: Array<() => void> = [];

  const release = (text: string) => {
    fullText += text;
    callbacks.onChunk?.(text);
    callbacks.onUpdate?.(fullText);
  };

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const tick = () => {
    if (!queue) return;
    // Constant rate by default; optionally speed up if the queue is backing up
    const n = catchUp
      ? Math.max(charsPerTick, Math.ceil(queue.length / 50))
      : charsPerTick;
    release(queue.slice(0, n));
    queue = queue.slice(n);

    if (!queue) {
      stopTimer();
      drainWaiters.splice(0).forEach((resolve) => resolve());
    }
  };

  const startTimer = () => {
    if (!timer) timer = setInterval(tick, tickMs);
  };

  const emit = (text: string) => {
    if (tickMs <= 0) return release(text);
    queue += text;
    startTimer();
  };

  /** Resolves once everything queued has been released. Rejects on abort. */
  const drain = () =>
    new Promise<void>((resolve, reject) => {
      if (!queue) return resolve();

      const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', onAbort, { once: true });

      drainWaiters.push(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      });
    });

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      let parsedAny = false;

      while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        const separatorLength = buffer.slice(idx).startsWith('\r\n') ? 4 : 2;
        buffer = buffer.slice(idx + separatorLength);
        parsedAny = true;

        let eventName = 'message';
        const data: string[] = [];
        for (const line of rawEvent.split(/\r?\n/)) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            data.push(line.slice(5).trimStart());
          }
        }

        const payload = data.join('\n');
        if (!payload || payload === '[DONE]') continue;

        let parsed: unknown = payload;
        try {
          parsed = JSON.parse(payload);
        } catch {
          // Non-JSON SSE payloads are valid text.
        }

        if (eventName === 'error') {
          const message =
            typeof parsed === 'string'
              ? parsed
              : parsed && typeof parsed === 'object' && 'message' in parsed
                ? String(parsed.message)
                : 'The stream returned an error.';
          throw new Error(message);
        }

        const text =
          typeof parsed === 'string'
            ? parsed
            : parsed && typeof parsed === 'object'
              ? String(
                  ('text' in parsed && parsed.text) ??
                    ('chunk' in parsed && parsed.chunk) ??
                    ('delta' in parsed && parsed.delta) ??
                    ('content' in parsed && parsed.content) ??
                    payload,
                )
              : payload;
        emit(text);
      }

      // Fallback for non-SSE raw streams
      if (!parsedAny && buffer && !buffer.includes('data:')) {
        emit(buffer);
        buffer = '';
      }
    }

    // Final flush
    if (buffer) {
      for (const line of buffer.split(/\r?\n/)) {
        if (line.startsWith('data:')) emit(line.slice(5).trimStart());
      }
    }

    // Wait for the typewriter queue to finish before completing
    await drain();

    callbacks.onComplete?.(fullText);
    return fullText;
  } catch (err) {
    // Stop pacing and discard anything still queued
    stopTimer();
    queue = '';

    const error = err instanceof Error ? err : new Error(String(err));
    if (error.name !== 'AbortError') callbacks.onError?.(error);
    throw error;
  } finally {
    stopTimer();
    reader.releaseLock();
  }
}