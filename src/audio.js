/**
 * Procedural Audio Synthesizer using Web Audio API
 * Generates polished, lively Diwali-inspired sound effects and retro tennis acoustics
 * with zero external audio assets.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.6;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.initialized = true;
        }
      }
    } catch (e) {
      console.warn("AudioContext could not be initialized:", e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Soft, airy whoosh with a gentle bell shimmer for vertical impulse jump
  playJump() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.09);

    gain.gain.setValueAtTime(0.09 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);

    // Subtle harmonic chime sparkle
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = "sine";
    chime.frequency.setValueAtTime(720, t);
    chime.frequency.exponentialRampToValueAtTime(900, t + 0.07);
    chimeGain.gain.setValueAtTime(0.03 * this.volume, t);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    chime.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);
    chime.start(t);
    chime.stop(t + 0.07);
  }

  // Subtle rocket fuse sizzle — called periodically while rocket is airborne.
  // Very low volume; creates a soft hiss/firework-trail ambience.
  playRocketFuseHiss() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.065);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.55));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Highpass to give it an airy hiss character (fuse-like)
    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 3000;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.045 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

    noise.connect(hpFilter);
    hpFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
  }

  // Electric sparkle crackle on racket hit — sharp, high-frequency, brief.
  // Replaces the previous wooden-resonant tone; much lighter and cleaner.
  playRacketHit(offsetPercent = 0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Very short high-frequency noise burst — electric crackle character
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.048);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.18));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass centred in the 3–5 kHz "electric sizzle" range
    const bpFilter = this.ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.value = 3800 - offsetPercent * 600; // slight pitch variation by zone
    bpFilter.Q.value = 3.2;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.14 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.048);

    noise.connect(bpFilter);
    bpFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);

    // Tiny transient sine click for attack sharpness
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(2200 - offsetPercent * 300, t);
    clickGain.gain.setValueAtTime(0.07 * this.volume, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
    click.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    click.start(t);
    click.stop(t + 0.022);
  }

  // Brilliant celestial Diwali sweet-shot chime:
  // Dual crystalline harmonic bells with sitar-inspired sparkling sheen
  playSweetShot() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Harmonic bell 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(740, t);
    osc1.frequency.exponentialRampToValueAtTime(1480, t + 0.18);
    gain1.gain.setValueAtTime(0.38 * this.volume, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.2);

    // Harmonic bell 2 (sparkling overtone)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1110, t);
    osc2.frequency.exponentialRampToValueAtTime(2220, t + 0.15);
    gain2.gain.setValueAtTime(0.25 * this.volume, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.18);
  }

  // Downward throat impact snap
  playThroatHit() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.14);

    gain.gain.setValueAtTime(0.35 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Warm, lively acoustic bounce: inspired by resonant Indian percussion (tabla/mridangam pop)
  playBounce(intensity = 1.0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const clampedIntensity = Math.min(Math.max(intensity, 0.4), 1.4);

    // Pitch bends down cleanly like a tuned drumhead
    osc.type = "sine";
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

    const initialGain = 0.28 * this.volume * clampedIntensity;
    gain.gain.setValueAtTime(initialGain, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // Warning tick for sudden-death countdown (< 5 seconds)
  playWarningTick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(940, t);
    osc.frequency.exponentialRampToValueAtTime(470, t + 0.05);

    gain.gain.setValueAtTime(0.14 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Dramatic sizzle / alert when rocket transforms into sudden-death bomb
  playBombTransformation() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(960, t + 0.26);

    gain.gain.setValueAtTime(0.32 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Celebratory Diwali firecracker sound:
  // Features crisp crackling bursts, warm resonant pop, and cheerful sparkling chimes
  playFirecrackerCelebration() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Resonant festive warm boom
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = "sine";
    boomOsc.frequency.setValueAtTime(170, t);
    boomOsc.frequency.exponentialRampToValueAtTime(35, t + 0.38);
    boomGain.gain.setValueAtTime(0.48 * this.volume, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boomOsc.start(t);
    boomOsc.stop(t + 0.38);

    // 2. Crackling noise sparkles (Diwali ladi / sparkler crackle)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.38);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const cracklePulse = Math.sin(i * 0.12) > 0.8 ? 2.2 : 0.4;
      data[i] = (Math.random() * 2 - 1) * cracklePulse * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 2400;
    noiseFilter.Q.value = 1.6;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45 * this.volume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);

    // 3. Celebratory sparkling bells
    [880, 1175, 1480].forEach((freq, idx) => {
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      const startTime = t + 0.05 + idx * 0.04;
      chimeOsc.type = "triangle";
      chimeOsc.frequency.setValueAtTime(freq, startTime);
      chimeGain.gain.setValueAtTime(0.16 * this.volume, startTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chimeOsc.start(startTime);
      chimeOsc.stop(startTime + 0.22);
    });
  }

  // Boom explosion when bomb detonates or touches player/racket
  playBombExplosion() {
    this.playFirecrackerCelebration();
  }

  // Sky-rocket point-scored sound: rising whistle launch → sharp boom → cascading crackles → sparkling chimes
  playPointScored(isPlayer1) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // P1 pitch is slightly higher/brighter; P2 is a touch warmer
    const pitchShift = isPlayer1 ? 1.0 : 0.88;

    // Phase 1 (0–0.16s): Rising whistle sweep — rocket launch
    const whistle = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(220 * pitchShift, t);
    whistle.frequency.exponentialRampToValueAtTime(1800 * pitchShift, t + 0.16);
    whistleGain.gain.setValueAtTime(0.28 * this.volume, t);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    whistle.connect(whistleGain);
    whistleGain.connect(this.ctx.destination);
    whistle.start(t);
    whistle.stop(t + 0.16);

    // Phase 2 (0.16s): Sharp boom — low sine + noise burst (explosion impact)
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(90, t + 0.16);
    boom.frequency.exponentialRampToValueAtTime(28, t + 0.42);
    boomGain.gain.setValueAtTime(0.52 * this.volume, t + 0.16);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    boom.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boom.start(t + 0.16);
    boom.stop(t + 0.42);

    const boomBufSize = Math.floor(this.ctx.sampleRate * 0.18);
    const boomBuf = this.ctx.createBuffer(1, boomBufSize, this.ctx.sampleRate);
    const boomData = boomBuf.getChannelData(0);
    for (let i = 0; i < boomBufSize; i++) {
      boomData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (boomBufSize * 0.22));
    }
    const boomNoise = this.ctx.createBufferSource();
    boomNoise.buffer = boomBuf;
    const boomFilter = this.ctx.createBiquadFilter();
    boomFilter.type = 'bandpass';
    boomFilter.frequency.value = 1800;
    boomFilter.Q.value = 1.4;
    const boomNoiseGain = this.ctx.createGain();
    boomNoiseGain.gain.setValueAtTime(0.42 * this.volume, t + 0.16);
    boomNoiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    boomNoise.connect(boomFilter);
    boomFilter.connect(boomNoiseGain);
    boomNoiseGain.connect(this.ctx.destination);
    boomNoise.start(t + 0.16);

    // Phase 3 (0.22–0.65s): Cascading crackles — staggered noise pops
    for (let i = 0; i < 5; i++) {
      const crackleDelay = 0.22 + i * 0.085 + Math.random() * 0.04;
      const crBufSize = Math.floor(this.ctx.sampleRate * 0.055);
      const crBuf = this.ctx.createBuffer(1, crBufSize, this.ctx.sampleRate);
      const crData = crBuf.getChannelData(0);
      for (let j = 0; j < crBufSize; j++) {
        crData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (crBufSize * 0.3));
      }
      const crNoise = this.ctx.createBufferSource();
      crNoise.buffer = crBuf;
      const crFilter = this.ctx.createBiquadFilter();
      crFilter.type = 'bandpass';
      crFilter.frequency.value = 2200 + i * 350;
      crFilter.Q.value = 2.0;
      const crGain = this.ctx.createGain();
      crGain.gain.setValueAtTime((0.28 - i * 0.03) * this.volume, t + crackleDelay);
      crGain.gain.exponentialRampToValueAtTime(0.001, t + crackleDelay + 0.055);
      crNoise.connect(crFilter);
      crFilter.connect(crGain);
      crGain.connect(this.ctx.destination);
      crNoise.start(t + crackleDelay);
    }

    // Phase 4 (0.32–0.85s): Sparkling chimes — festive melodic shimmer
    const chimeFreqs = isPlayer1
      ? [880, 1175, 1480, 1760, 2093]
      : [784, 1046, 1318, 1568, 1976];
    chimeFreqs.forEach((freq, idx) => {
      const chStart = t + 0.32 + idx * 0.085;
      const chOsc = this.ctx.createOscillator();
      const chGain = this.ctx.createGain();
      chOsc.type = 'triangle';
      chOsc.frequency.setValueAtTime(freq, chStart);
      chGain.gain.setValueAtTime(0.14 * this.volume, chStart);
      chGain.gain.exponentialRampToValueAtTime(0.001, chStart + 0.26);
      chOsc.connect(chGain);
      chGain.connect(this.ctx.destination);
      chOsc.start(chStart);
      chOsc.stop(chStart + 0.26);
    });
  }

  // Festive Diwali match victory fanfare
  playMatchWon() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const melody = [
      { f: 523, d: 0.12 },
      { f: 659, d: 0.12 },
      { f: 784, d: 0.15 },
      { f: 1046, d: 0.42 }
    ];

    let offset = 0;
    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + offset;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.f, startTime);

      gain.gain.setValueAtTime(0.24 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + note.d);

      offset += note.d * 0.85;
    });
  }
}

export const sound = new SoundSystem();
