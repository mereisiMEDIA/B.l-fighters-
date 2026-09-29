/**
 * Procedural Web Audio Sound Engine for Punch-O-Rama 3D
 * Provides snappy, comedic arcade fighting sound effects with zero external assets.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playWhoosh(pitch: number = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(90 * pitch, t + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.14);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);

    // Subtle air noise rush
    this.playNoiseClick(0.08, 0.08, 1200);
  }

  public playLightHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Snappy punch/kick slap impact: fast punchy pop + crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.07);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);

    // Punch transient snap
    this.playNoiseClick(0.025, 0.25, 2400);
  }

  public playHeavyHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Deep heavy punch/kick impact: sub boom + body knock + crunch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(260, t);
    subOsc.frequency.exponentialRampToValueAtTime(45, t + 0.24);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.24);

    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    subOsc.connect(filter);
    filter.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(t);
    subOsc.stop(t + 0.27);

    // Punchy mid thump
    const midOsc = this.ctx.createOscillator();
    const midGain = this.ctx.createGain();
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(580, t);
    midOsc.frequency.exponentialRampToValueAtTime(110, t + 0.16);
    midGain.gain.setValueAtTime(0.5, t);
    midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);

    midOsc.connect(midGain);
    midGain.connect(this.ctx.destination);

    midOsc.start(t);
    midOsc.stop(t + 0.18);

    // Heavy impact crunch
    this.playNoiseClick(0.05, 0.45, 1400);
  }

  public playBlock() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Metallic block clank: dual square harmonic clank with ringing ping
    const freqs = [880, 1420, 2150];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = idx === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.18);

      const amp = 0.35 / (idx + 1);
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.19);
    });

    // Metallic shield snap
    this.playNoiseClick(0.02, 0.3, 3500);
  }

  public playSuperHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Massive explosion bass drop + shockwave blast
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(320, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.7);

    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    subOsc.start(t);
    subOsc.stop(t + 0.76);

    // Heavy blast crunch
    this.playNoiseClick(0.18, 0.6, 1100);

    // High energy shriek
    const shriek = this.ctx.createOscillator();
    const shriekGain = this.ctx.createGain();
    shriek.type = 'sawtooth';
    shriek.frequency.setValueAtTime(1400, t);
    shriek.frequency.exponentialRampToValueAtTime(250, t + 0.4);

    shriekGain.gain.setValueAtTime(0.4, t);
    shriekGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    shriek.connect(shriekGain);
    shriekGain.connect(this.ctx.destination);

    shriek.start(t);
    shriek.stop(t + 0.43);
  }

  /**
   * Authentic boxing KO bell (rapid 4-ring "ding ding ding ding!")
   */
  public playKoBell() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 4 quick crisp rings
    for (let r = 0; r < 4; r++) {
      const ringTime = t + r * 0.16;
      [1200, 2400, 3600].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ringTime);

        const amp = 0.4 / (idx + 1);
        gain.gain.setValueAtTime(amp, ringTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ringTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(ringTime);
        osc.stop(ringTime + 0.38);
      });
    }
  }

  /**
   * Synthesized crowd cheer on big hits, supers, and KOs (no external files)
   */
  public playCrowdCheer(duration = 1.6, intensity = 0.6) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Pink/stadium filtered noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter centered around crowd vocal resonance (700Hz - 1400Hz)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, t);
    filter.frequency.linearRampToValueAtTime(1150, t + duration * 0.4);
    filter.frequency.linearRampToValueAtTime(750, t + duration);
    filter.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(intensity * 0.5, t + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + duration + 0.05);

    // Whistling cheers in the crowd
    for (let w = 0; w < 3; w++) {
      const whistleOsc = this.ctx.createOscillator();
      const whistleGain = this.ctx.createGain();
      const whistleStart = t + 0.1 + w * 0.22;
      const wFreq = 1600 + Math.random() * 800;

      whistleOsc.type = 'sine';
      whistleOsc.frequency.setValueAtTime(wFreq, whistleStart);
      whistleOsc.frequency.exponentialRampToValueAtTime(wFreq * 1.3, whistleStart + 0.18);
      whistleOsc.frequency.exponentialRampToValueAtTime(wFreq * 0.9, whistleStart + 0.45);

      whistleGain.gain.setValueAtTime(0.001, whistleStart);
      whistleGain.gain.linearRampToValueAtTime(0.07, whistleStart + 0.1);
      whistleGain.gain.exponentialRampToValueAtTime(0.001, whistleStart + 0.45);

      whistleOsc.connect(whistleGain);
      whistleGain.connect(this.ctx.destination);

      whistleOsc.start(whistleStart);
      whistleOsc.stop(whistleStart + 0.46);
    }
  }

  public playJump() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Spring boing up
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.14);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playDash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(550, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playRoundStart() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Classic arcade boxing bell gong
    const t = this.ctx.currentTime;
    [440, 880, 1320].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const amp = 0.3 / (i + 1);
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 1.25);
    });
  }

  public playKoAnnounce() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Deep heavy cinematic impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.0);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 1.15);
  }

  public playSuperReady() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = t + idx * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.16);
    });
  }

  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.5, d: 0.4 },  // C6
    ];

    let offset = 0;
    notes.forEach((n) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const startTime = t + offset;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.d);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + n.d + 0.05);

      offset += n.d * 0.9;
    });
  }

  private playNoiseClick(duration: number, volume: number, filterFreq?: number) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    if (filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterFreq > 2000 ? 'highpass' : 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
      noise.connect(filter);
      filter.connect(gain);
    } else {
      noise.connect(gain);
    }

    gain.connect(this.ctx.destination);
    noise.start();
  }
}

export const soundEngine = new SoundEngine();
