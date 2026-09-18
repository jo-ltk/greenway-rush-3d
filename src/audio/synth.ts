// Procedural Web Audio synthesizer for GREENWAY RUSH
// Racing-themed sounds: engine, skid, boost, countdown, victory

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isMuted: boolean = false;
  private initialized: boolean = false;

  constructor() {
    const savedMute = localStorage.getItem('greenway_rush_muted');
    this.isMuted = savedMute === 'true';
  }

  public init(): void {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.55, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Engine oscillator — low rumble that scales with speed
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(120, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();

      this.initialized = true;
    } catch {
      // Audio context restricted before user interaction
    }
  }

  public ensureContext(): void {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  /** Update engine sound based on vehicle speed (0..22 m/s) and throttle */
  public updateEngine(speed: number, isGrounded: boolean, throttle: number): void {
    if (!this.ctx || !this.engineGain || !this.engineFilter || !this.engineOsc) return;
    const now = this.ctx.currentTime;

    if (!isGrounded || speed < 0.1) {
      // Idle rumble
      const idleGain = Math.abs(throttle) > 0.1 ? 0.06 : 0.03;
      this.engineGain.gain.setTargetAtTime(idleGain, now, 0.08);
      this.engineOsc.frequency.setTargetAtTime(65 + Math.abs(throttle) * 30, now, 0.1);
      this.engineFilter.frequency.setTargetAtTime(150, now, 0.1);
      return;
    }

    const clampedSpeed = Math.min(speed, 22);
    const t = clampedSpeed / 22;
    // Engine pitch rises with speed
    const targetFreq = 65 + t * 180 + Math.abs(throttle) * 40;
    const targetFilter = 120 + t * 800;
    const targetGain = 0.06 + t * 0.18;

    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.04);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.05);
  }

  /** Tire skid sound */
  public playSkid(): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // White noise burst filtered to sound like tire screech
    const bufSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(0.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  /** Boost activation whoosh */
  public playBoost(): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.28);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  /** Token collection — bright chime */
  public playCollect(): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [1046.50, 1318.51, 1568.0]; // C6, E6, G6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  /** Checkpoint pass — cheerful ascending arpeggio */
  public playCheckpoint(): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  /** Countdown beep — low for 3/2, bright for 1, GO fanfare */
  public playCountdownBeep(n: number): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (n > 0) {
      // 3, 2, 1 — short beep
      const freq = n === 1 ? 880 : 440;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.24);
    } else {
      // GO! — upward fanfare
      const goNotes = [523.25, 659.25, 783.99, 1046.50];
      goNotes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const t = now + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.22);
      });
    }
  }

  /** Hazard / respawn — thud sound */
  public playHazard(): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Landing impact thud */
  public playLand(intensity: number): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    if (intensity < 2.5) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const freq = 120 + intensity * 10;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + 0.12);
    g.gain.setValueAtTime(Math.min(0.45, intensity * 0.05), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Victory fanfare (finish line) */
  public playVictory(): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const melody = [
      { freq: 523.25, time: 0.00, dur: 0.14 },
      { freq: 659.25, time: 0.15, dur: 0.14 },
      { freq: 783.99, time: 0.30, dur: 0.18 },
      { freq: 1046.50, time: 0.48, dur: 0.12 },
      { freq: 1174.66, time: 0.62, dur: 0.55 },
    ];
    melody.forEach(note => {
      if (!this.ctx || !this.masterGain) return;
      const t = now + note.time;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, t);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + note.dur);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + note.dur + 0.05);
    });
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('greenway_rush_muted', String(this.isMuted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
    return this.isMuted;
  }

  public get muted(): boolean {
    return this.isMuted;
  }
}
