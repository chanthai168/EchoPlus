import { useRef, useState, useCallback } from 'react';
import { getSocket } from './socket';

export function useVoiceStreamer() {
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState('');
  const [finals, setFinals] = useState<string[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const offRef = useRef<(() => void) | null>(null);

  const [isReady,setIsReady] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const socket = getSocket();

      const onInterim = ({ text }: { text: string }) => setInterim(text);
      const onFinal = ({ text }: { text: string }) => {
        setFinals((prev) => [...prev, text]);
        setInterim('');
      };
      socket.on('transcript-interim', onInterim);
      socket.on('transcript-final', onFinal);
      offRef.current = () => {
        socket.off('transcript-interim', onInterim);
        socket.off('transcript-final', onFinal);
      };

      // the shared socket may already be connected, so 'connect' won't fire again
      const begin = () => socket.emit('start-recording', {});
      if (socket.connected) begin();
      else socket.once('connect', begin);

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      await audioCtx.audioWorklet.addModule('/pcm-processor.js');

      const source = audioCtx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(audioCtx, 'pcm-processor');
      nodeRef.current = node;

      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (socket.connected) socket.emit('audio-chunk', e.data);
      };

      // start sending only after the server's Gemini session is ready
      socket.once('recording-ready', () => {
        try{
          source.connect(node)
          setIsReady(true);
        }
        catch(e){
          setIsReady(false);
        }

      });

      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    nodeRef.current?.port.close();
    nodeRef.current?.disconnect();
    nodeRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    offRef.current?.();
    offRef.current = null;

    // do NOT disconnect: the TTS hook is using this socket
    getSocket().emit('stop-recording');

    setIsRecording(false);
  }, []);

  const resetTranscripts = useCallback(() => {
    setInterim('');
    setFinals([]);
  }, []);

  return { isRecording, startRecording, stopRecording, interim, finals, resetTranscripts,isReady,setIsReady };
}