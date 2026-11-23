import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

export type TranscriptEvent =
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string }
  | { type: 'speech-start' }
  | { type: 'speech-end' }
  | { type: 'closed'; code: number; reason: string };

interface ClientSession {
  ws: WebSocket;
  onEvent: (e: TranscriptEvent) => void;
  setupSettled: boolean;
  ending: boolean;
  endTimer?: ReturnType<typeof setTimeout>;
}

@Injectable()
export class GeminiTranscribeServiceLive implements OnModuleDestroy {
  private readonly logger = new Logger(GeminiTranscribeServiceLive.name);
  private readonly sessions = new Map<string, ClientSession>();
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.model =
      this.configService.get<string>('GEMINI_3_5_TRANSCRIBE_LIVE') ||
      'gemini-3.5-transcribe-live';
  }

  /**
   * Connects to Gemini Live API for a specific clientId and registers an event callback.
   */
  public connectToGemini(
    clientId: string,
    onEvent: (e: TranscriptEvent) => void,
  ): Promise<void> {
    // Clean up any existing session for this clientId first
    this.close(clientId);

    return new Promise((resolve, reject) => {
      const host = 'generativelanguage.googleapis.com';
      const url = `wss://${host}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

      const ws = new WebSocket(url);
      const session: ClientSession = {
        ws,
        onEvent,
        setupSettled: false,
        ending: false,
      };

      this.sessions.set(clientId, session);

      ws.on('open', () => {
        this.logger.log(`[${clientId}] Connected to Gemini Live API upstream.`);
        this.sendSetupPayload(clientId, ws);
      });

      ws.on('message', (data: WebSocket.Data) => {
        const msg = JSON.parse(data.toString());
        this.logger.debug(`[${clientId}] ${JSON.stringify(msg)}`);

        if (msg.setupComplete) {
          if (!session.setupSettled) {
            session.setupSettled = true;
            resolve();
          }
          return;
        }

        const sc = msg.serverContent;

        if (sc?.interimInputTranscription?.text) {
          onEvent({ type: 'interim', text: sc.interimInputTranscription.text });
        }

        if (sc?.inputTranscription?.text) {
          onEvent({ type: 'final', text: sc.inputTranscription.text });
          if (session.ending && this.sessions.get(clientId) === session) {
            this.close(clientId);
          }
        }

        const vad = msg.voiceActivity?.type;
        if (vad === 'ACTIVITY_START') onEvent({ type: 'speech-start' });
        if (vad === 'ACTIVITY_END') onEvent({ type: 'speech-end' });
      });

      ws.on('error', (error) => {
        this.logger.error(`[${clientId}] Gemini WS Error:`, error);
        if (!session.setupSettled) {
          session.setupSettled = true;
          reject(error);
        }
      });

      ws.on('close', (code, reason) => {
        const reasonStr = reason.toString();
        this.logger.warn(
          `[${clientId}] Gemini WS closed: ${code} - ${reasonStr}`,
        );

        // Only remove if this exact socket is still the active one for clientId
        if (this.sessions.get(clientId)?.ws === ws) {
          this.sessions.delete(clientId);
          onEvent({ type: 'closed', code, reason: reasonStr });
        }

        if (!session.setupSettled) {
          session.setupSettled = true;
          reject(new Error(`Gemini WS closed before setup completed (${code})`));
        }
      });
    });
  }

  /**
   * Step 1: Send configuration payload for a specific client's WebSocket.
   */
  private sendSetupPayload(clientId: string, ws: WebSocket) {
    if (ws.readyState !== WebSocket.OPEN) return;

    const setupMessage = {
      setup: {
        model: `models/${this.model}`,
        generationConfig: {
          responseModalities: ['TEXT'],
        },
        inputAudioTranscription: {
          languageCodes: ['km', 'en'],
        },
      },
    };

    ws.send(JSON.stringify(setupMessage));
    this.logger.log(`[${clientId}] Sent Gemini setup configuration.`);
  }

  /**
   * Step 2: Forward a specific client's raw audio chunks upstream to Google.
   */
  public sendAudioChunk(clientId: string, pcmBuffer: Buffer) {
    const session = this.sessions.get(clientId);
    if (!session || session.ws.readyState !== WebSocket.OPEN) return;

    const audioMessage = {
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: pcmBuffer.toString('base64'),
        },
      },
    };

    session.ws.send(JSON.stringify(audioMessage));
  }

  /**
   * Signal that microphone input ended, allowing Gemini to emit its final transcript.
   */
  public finishAudioInput(clientId: string) {
    const session = this.sessions.get(clientId);
    if (!session) return;

    if (session.ws.readyState !== WebSocket.OPEN) {
      this.close(clientId);
      return;
    }

    if (session.ending) return;

    session.ending = true;
    session.endTimer = setTimeout(() => {
      if (this.sessions.get(clientId) !== session) return;
      this.logger.warn(`[${clientId}] Closing Gemini session after final-transcript timeout.`);
      this.close(clientId);
    }, 10_000);

    session.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
  }

  /**
   * Close and clean up the Gemini connection for ONLY one specific client.
   */
  public close(clientId: string) {
    const session = this.sessions.get(clientId);
    if (!session) return;

    // Remove first so the 'close' listener won't treat it as an unexpected drop
    this.sessions.delete(clientId);
    if (session.endTimer) clearTimeout(session.endTimer);

    if (
      session.ws.readyState === WebSocket.OPEN ||
      session.ws.readyState === WebSocket.CONNECTING
    ) {
      session.ws.close();
    }

    this.logger.log(`[${clientId}] Closed Gemini WS session.`);
  }

  /**
   * Clean up all active client sessions when the NestJS app shuts down.
   */
  onModuleDestroy() {
    for (const clientId of Array.from(this.sessions.keys())) {
      this.close(clientId);
    }
  }
}