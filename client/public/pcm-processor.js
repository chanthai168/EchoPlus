class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000; // sampleRate = AudioContext rate (44100/48000)
    this.t = 0;                      // next output position, in input-sample units
    this.prev = 0;                   // last sample of previous block
    this.out = new Int16Array(1600); // 100ms @ 16kHz
    this.outPos = 0;
  }

  process(inputs) {
    const ch = inputs[0][0];
    if (!ch) return true;

    const get = (i) => (i < 0 ? this.prev : ch[i]);
    let t = this.t;

    // linear-interpolation resample to 16kHz
    while (t < ch.length - 1) {
      const i0 = Math.floor(t);
      const frac = t - i0;
      const s = get(i0) * (1 - frac) + get(i0 + 1) * frac;

      // Float32 [-1,1] -> Int16
      const clamped = Math.max(-1, Math.min(1, s));
      this.out[this.outPos++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

      if (this.outPos === this.out.length) {
        const chunk = this.out.slice().buffer;
        this.port.postMessage(chunk, [chunk]);
        this.outPos = 0;
      }
      t += this.ratio;
    }

    this.t = t - ch.length;
    this.prev = ch[ch.length - 1];
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);