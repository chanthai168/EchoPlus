// src/hooks/useVoiceChat.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocket } from './socket';
import { useAudioPlayer } from './useAudioPlayer';
import { useCharacter } from '../../context/CharacterContext';

const SAMPLE_RATE = 24000;

export type Phase = 'idle' | 'processing' | 'playing' | 'buffering' | 'ended';

interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}
interface TtsChunk {
  audio: string;
  alignment?: Alignment;
  sentenceIndex: number;
  runId: number;
}

export function useVoiceChat(url: string) {
  const [text, setText] = useState(''); // text revealed in sync with the voice
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nextPlayRef = useRef(0);
  const leftoverRef = useRef<Uint8Array | null>(null);
  const queueRef = useRef<{ at: number; text: string }[]>([]);
  const lastSentenceRef = useRef(-1);
  const chunkCountRef = useRef(0);
  const doneRef = useRef(false);
  const activeRef = useRef(0);
  const runIdRef = useRef<number | null >(0);
  const sentenceStartRef = useRef<Record<number, number>>({});
  const seenWordsInSentence = useRef<Record<number, boolean>>({});
  const { analyser, analyserRef, ensureCtx } = useAudioPlayer({SAMPLE_RATE});


  const {character} = useCharacter();

  const socket = getSocket();
  socketRef.current = socket;

  useEffect(() => {

    // returns the audio-clock start time, or null if nothing was scheduled
    const playPcm = (base64: string): number | null => {
      const ctx = ensureCtx();
      ctxRef.current = ctx;
      let bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

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
      if (int16.length === 0) return null;
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
      buffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      
      if (analyserRef.current) {
        source.connect(analyserRef.current);
      } else {
        source.connect(ctx.destination);
      }

      const runId = runIdRef.current;
      activeRef.current += 1;
      source.onended = () => {
        if (runId !== runIdRef.current) return;
        activeRef.current -= 1;
        if (activeRef.current === 0) setPhase(doneRef.current ? 'ended' : 'buffering');
      };

      const startTime = Math.max(ctx.currentTime + 0.1, nextPlayRef.current);
      source.start(startTime);
      nextPlayRef.current = startTime + buffer.duration;
      return startTime;
    };

    socket.on('connect_error', (e) => setError(`Backend connection failed: ${e.message}`));

    // ---------- Cartesia ----------
    const onChunk = (p: {
      audio: string;
      text?: string;
      sentenceIndex: number;
      runId: number;
    }) => {
      if (p.runId !== runIdRef.current) return;

      try {
        if (typeof p.audio !== 'string' || !p.audio) {
          throw new Error('Empty audio chunk');
        }

        const startTime = playPcm(p.audio);
        if (startTime === null) return;

        // Remember when this sentence started playing
        if (sentenceStartRef.current[p.sentenceIndex] === undefined) {
          sentenceStartRef.current[p.sentenceIndex] = startTime;
        }

        chunkCountRef.current += 1;
        setPhase('playing');
      } catch (e) {
        setError(
          e instanceof Error
            ? `Audio playback failed: ${e.message}`
            : 'Audio playback failed',
        );
      }
    };

    const onTimestamps = (p:any) => {
      if (p.runId !== runIdRef.current) return;
      if (!p.alignment?.words?.length) return;

      const startTime = sentenceStartRef.current[p.sentenceIndex];
      if (startTime === undefined) return;

      const { words, start } = p.alignment;
      const sentenceIdx = p.sentenceIndex;

      // Add space between sentences
      if (sentenceIdx !== lastSentenceRef.current) {
        if (lastSentenceRef.current !== -1) {
          queueRef.current.push({ at: startTime, text: ' ' });
        }
        lastSentenceRef.current = sentenceIdx;
        seenWordsInSentence.current[sentenceIdx] = false;
      }

      words.forEach((word: string, i: number) => {
        const isFirstWord = !seenWordsInSentence.current[sentenceIdx];
        seenWordsInSentence.current[sentenceIdx] = true;

        queueRef.current.push({
          at: startTime + (start[i] ?? 0),
          text: (isFirstWord ? '' : ' ') + word.trim(),
        });
      });
    };

    const onRunStarted = ({ runId }:{runId:number}) => {
      runIdRef.current = runId;
      resetPlayback();                 // stop anything still playing from the previous run
      setText('');
      setPhase('processing');          // covers voice-initiated runs, which never went through send()
    };

    const onInterrupted =  ({ runId }:{runId:number}) => {
      if (runId !== runIdRef.current) return;
      resetPlayback();
      setPhase('ended');
    };
    
    const onDone = ({ runId }: { runId?: number }) => {
      if (runId !== runIdRef.current) return;
      doneRef.current = true;
      if (chunkCountRef.current === 0) {
        setPhase('idle');
        setError('Response finished without any audio. Check the backend TTS error.');
      } else if (activeRef.current === 0) {
        setPhase('ended');
      }
    }

    const onError = ({ message, runId }: { message?: string; runId?: number }) => {
      if (runId !== undefined && runId !== runIdRef.current) return;
      setPhase('idle');
      setError(`Text-to-speech failed: ${message ?? 'Unknown backend error'}`);
    }

    const onErrorCharacterSelection = () => {
      console.log('ErrorCharacterSelection');
    }

    const handlers: Record<string, (...args: any[]) => void> = {
      'tts-chunk-catesia': onChunk,
      'tts-timestamps': onTimestamps,
      'run-started': onRunStarted,
      'interrupted': onInterrupted,
      'failed-character-select': onErrorCharacterSelection,
      'done': onDone,
      'error': onError,
    };

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));

    // reveal characters whose audio time has been reached
    let raf = 0;
    const tick = () => {
      const ctx = ctxRef.current;
      if (ctx && queueRef.current.length > 0) {
        const audibleNow = ctx.currentTime - (ctx.outputLatency || 0);
        const q = queueRef.current;
        let out = '';
        while (q.length && q[0].at <= audibleNow) out += q.shift()!.text;
        if (out) setText((prev) => prev + out);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, [url]);

  useEffect(()=>{
    socket.emit('select-character',{ characterId: character });
    // alert(character)
  },[character])

  const resetPlayback = () => {
    leftoverRef.current = null;
    nextPlayRef.current = 0;
    queueRef.current = [];
    lastSentenceRef.current = -1;
    chunkCountRef.current = 0;
    doneRef.current = false;
    activeRef.current = 0;
    sentenceStartRef.current = {};
    seenWordsInSentence.current = {};
  };

  // call from a click handler so the browser allows audio
  const send = useCallback(async (message: string) => {
    runIdRef.current = null;

    if (ctxRef.current) {
      await ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    const ctx = ensureCtx();
    ctxRef.current = ctx;
    try {
      await ctx.resume();
    } catch (e) {
      setError(e instanceof Error ? `Could not start audio: ${e.message}` : 'Could not start audio');
      return false;
    }

    resetPlayback();
    setText('');
    setError('');
    setPhase('processing');
    socketRef.current?.emit('start-conversation', { message});
    return true;
  }, []);

  // stops the voice and the text reveal; the server may finish generating, but its output is ignored
  const stop = useCallback(() => {
    const runId = runIdRef.current;
    runIdRef.current = null;          // drop any late chunks from this run
    
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    resetPlayback();
    setPhase('idle');

    if (runId != null) {
      socketRef.current?.emit('interrupt', { runId });
    }
  }, []);

  return { text, phase, error, send, stop,analyser };
}