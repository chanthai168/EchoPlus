// src/components/RealtimeVoice.tsx
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStage } from '../../context/StageContext';

const url = import.meta.env.VITE_BACKEND_URL;
const SAMPLE_RATE = 24000;

interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface TtsChunk {
  audio: string;
  alignment?: Alignment;
  sentenceIndex: number;
}

type Phase = 'idle' | 'processing' | 'playing' | 'buffering' | 'ended';

export default function RealtimeVoice() {
    const [text, setText] = useState('');
    const [displayedText, setDisplayedText] = useState('');
    const [audioStatus, setAudioStatus] = useState('Ready');

    const {setStage} = useStage();

    const [phase, setPhase] = useState<Phase>('idle');
    const doneRef = useRef(false);
    const activeSourcesRef = useRef(0);
    const runIdRef = useRef(0); // ignores late onended events from a previous run

    const socketRef = useRef<Socket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const nextPlayTimeRef = useRef(0);
    const audioChunkCountRef = useRef(0);
    const leftoverRef = useRef<Uint8Array | null>(null);

  // characters waiting to be revealed, each with the audio-clock time it is spoken
  const queueRef = useRef<{ at: number; text: string }[]>([]);
  const lastSentenceRef = useRef(-1);

  const ensureCtx = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    return audioContextRef.current;
  };

  // returns the audio-clock time the chunk starts at, or null if nothing was scheduled
  const playPcmChunk = (base64: string): number | null => {
    const ctx = ensureCtx();

    let bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    // keep sample alignment (16-bit = 2 bytes)
    if (leftoverRef.current) {
      const merged = new Uint8Array(leftoverRef.current.length + bytes.length);
      merged.set(leftoverRef.current);
      merged.set(bytes, leftoverRef.current.length);
      bytes = merged;
      leftoverRef.current = null;
    }
    if (bytes.length % 2 !== 0) {
      leftoverRef.current = bytes.slice(bytes.length - 1);
      bytes = bytes.slice(0, bytes.length - 1);
    }

    const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    if (int16.length === 0) return null; // a zero-length buffer would throw

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const runId = runIdRef.current;
    activeSourcesRef.current += 1;
    source.onended = () => {
    if (runId !== runIdRef.current) return; // stale event from an old run
        activeSourcesRef.current -= 1;
    if (activeSourcesRef.current === 0) {
        setPhase(doneRef.current ? 'ended' : 'buffering');
    }
    };

    // small lookahead so the first chunk doesn't underrun
    const startTime = Math.max(ctx.currentTime + 0.1, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    return startTime;


  };

  useEffect(() => {
    const socket = io(url);
    socketRef.current = socket;

    // NOTE: no 'llm-token' handler. Text is revealed from the audio timestamps.

    socket.on('connect_error', (error) => {
      setAudioStatus(`Backend connection failed: ${error.message}`);
    });

    socket.on('tts-chunk', ({ audio, alignment, sentenceIndex }: TtsChunk) => {
      try {
        if (typeof audio !== 'string' || audio.length === 0) {
          throw new Error('Received an empty or invalid audio chunk');
        }

        const startTime = playPcmChunk(audio);
        if (startTime === null) return;
        setPhase('playing'); // also moves 'buffering' back to 'playing'

        audioChunkCountRef.current += 1;
        setAudioStatus(
          `Playing audio (${audioChunkCountRef.current} chunk${audioChunkCountRef.current === 1 ? '' : 's'})`,
        );

        if (!alignment) return;

        const chars = alignment.characters;
        const starts = alignment.character_start_times_seconds;
        // works whether the timestamps are per-chunk or cumulative
        const base = starts[0] ?? 0;

        // sentences are trimmed on the server, so re-add the space between them
        let prefix = '';
        if (sentenceIndex !== lastSentenceRef.current) {
          if (lastSentenceRef.current !== -1) prefix = ' ';
          lastSentenceRef.current = sentenceIndex;
        }

        chars.forEach((ch, i) => {
          queueRef.current.push({
            at: startTime + (starts[i] - base),
            text: (i === 0 ? prefix : '') + ch,
          });
        });

        
      } catch (error) {
        setStage('thinking');
        setAudioStatus(
          error instanceof Error
            ? `Audio playback failed: ${error.message}`
            : 'Audio playback failed',
        );
        console.error('Unable to play TTS audio chunk', error);
      }
    });

    socket.on('error', ({ message }: { message?: string }) => {
    setPhase('idle');
    setAudioStatus(`Text-to-speech failed: ${message ?? 'Unknown backend error'}`);
    });

    socket.on('done', () => {
    doneRef.current = true;
    if (audioChunkCountRef.current === 0) {
        setPhase('idle');
        setAudioStatus('Response finished without any audio chunks. Check the backend TTS error.');
    } else if (activeSourcesRef.current === 0) {
        setPhase('ended'); // audio had already finished before `done` arrived
    }
    });

    // reveal every character whose audio time has been reached
    let raf = 0;
    const tick = () => {
      const ctx = audioContextRef.current;
      if (ctx && queueRef.current.length > 0) {
        const audibleNow = ctx.currentTime - (ctx.outputLatency || 0);
        const q = queueRef.current;
        let out = '';
        while (q.length && q[0].at <= audibleNow) out += q.shift()!.text;
        if (out) setDisplayedText((prev) => prev + out);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      socket.disconnect();
      audioContextRef.current?.close();
      audioContextRef.current = null; // so React StrictMode's second mount gets a fresh context
    };
  }, []);

    useEffect(()=>{
        if(phase=='playing'){
            setStage('speaking');
        }
        else if(phase == 'idle'){
            setStage('idle')
        }
        else if(phase == 'processing'){
            setStage('thinking');
        }
        else{
            setStage('idle');
        }
    },[phase])

  const start = async () => {
    // fresh context on every run: stops any audio still playing from the last one
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    const ctx = ensureCtx();
    try {
      await ctx.resume();
    } catch (error) {
      setAudioStatus(
        error instanceof Error ? `Could not start audio: ${error.message}` : 'Could not start audio',
      );
      return;
    }

    leftoverRef.current = null;
    nextPlayTimeRef.current = 0;
    audioChunkCountRef.current = 0;
    queueRef.current = [];
    lastSentenceRef.current = -1;
    setDisplayedText('');
    setAudioStatus('Waiting for response and audio...');
    socketRef.current?.emit('start-conversation', { message: text });

    runIdRef.current += 1;
    doneRef.current = false;
    activeSourcesRef.current = 0;
    setPhase('processing');
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-24 border p-3 rounded mb-4"
        placeholder="Type your message..."
      />
      <button onClick={start} className="bg-blue-600 text-white px-6 py-2 rounded">
        Start Streaming
      </button>

      <p className="mt-3 text-sm" role="status" aria-live="polite">
        {audioStatus}
      </p>

      <div className="mt-8 text-xl leading-relaxed whitespace-pre-wrap">{displayedText}</div>
    </div>
  );
}