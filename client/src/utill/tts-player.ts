export class TtsPlayer {
  private ctx: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private runId: number | null = null;

  // call from a click handler
  async init() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext({ sampleRate: 24000 });
    }
    await this.ctx.resume();
  }

  // call on 'run-started'
  startRun(runId: number) {
    this.stop();
    this.runId = runId;
  }

  push(base64: string, runId: number) {
    if (!this.ctx || runId !== this.runId) return;   // stale or unassigned

    const bin = atob(base64);
    const len = bin.length - (bin.length % 2);        // keep whole samples only
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);

    const pcm = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 0x8000;

    const buf = this.ctx.createBuffer(1, f32.length, 24000);
    buf.copyToChannel(f32, 0);

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);

    // small lead-in on the first chunk avoids a clipped start
    const now = this.ctx.currentTime;
    this.nextTime = Math.max(this.nextTime, now + 0.05);
    src.start(this.nextTime);
    this.nextTime += buf.duration;

    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  stop() {
    this.sources.forEach((s) => {
      s.onended = null;
      try { s.stop(); } catch {}
    });
    this.sources.clear();
    this.nextTime = 0;
  }

  get isPlaying() {
    return this.sources.size > 0;
  }
}