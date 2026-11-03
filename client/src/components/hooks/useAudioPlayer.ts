import { useState, useRef, useCallback } from "react";

export const useAudioPlayer = ({ SAMPLE_RATE }: { SAMPLE_RATE: number | undefined }) => {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      const options: AudioContextOptions = SAMPLE_RATE ? { sampleRate: SAMPLE_RATE } : {};
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass(options);
      
      // បង្កើត analyser តែម្តងគត់ក្នុងមួយជីវិតរបស់ custom hook នេះ
      const node = ctx.createAnalyser();
      node.connect(ctx.destination); // Connect ទៅកាន់ Speakers
      
      audioContextRef.current = ctx;
      analyserRef.current = node;
      setAnalyser(node); // បញ្ជូនទៅ State សម្រាប់ Canvas UI ប្រើ
      
      return ctx;
    }
    return audioContextRef.current;
  }, [SAMPLE_RATE]);

  // បង្វិល ensureCtx ត្រឡប់ទៅវិញធម្មតា (និង analyser សម្រាប់ Canvas)
  return { ensureCtx, analyser, analyserRef };
};
