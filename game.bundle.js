(() => {
"use strict";

// --- src/config.js ---
/**
 * Game Configuration & Physics Parameters
 * Diwali Open Court Edition with Arcade Bouncing, Multi-Zone Rackets,
 * and Rocket-to-Bomb Hot-Potato Sudden Death Mechanics.
 */

const DEFAULT_CONFIG = {
  court: {
    width: 1000,
    height: 600,
    groundY: 520,         // Vertical coordinate of court ground line
    baselineP1X: 110,     // Player 1 fixed baseline X
    baselineP2X: 890,     // Player 2 fixed baseline X
    ceilingY: 30,         // Top playable court boundary
    minX: 10,             // Left playable court boundary
    maxX: 990,            // Right playable court boundary (width - 10)
  },

  player: {
    width: 38,
    height: 64,
    gravity: 950,         // Downward acceleration in px/sec^2
    jumpImpulse: -420,    // Upward instantaneous velocity per tap/click (px/sec)
    terminalVelocity: 600,// Max downward falling speed
    racketOffset: 30,     // Distance of racket in front of player
  },

  // Racket shape: Oval frame with enlarged sweet spot target zone and direct straight cylindrical handle
  racket: {
    totalHeight: 80,
    headWidth: 26,
    headHeight: 52,       // Oval frame with strings & sweet-spot target zone
    sweetSpotWidth: 16,   // Width of center target zone
    sweetSpotHeight: 18,  // Practical sweet-spot focus area (±9px from center)
    sweetSpotSpeedMultiplier: 1.4, // Super shot speed boost on sweet spot hit
    handleHeight: 28,     // Straight cylindrical side-view handle connected directly to frame
    handleWidth: 8,       // Cylindrical grip diameter
  },

  ball: {
    radius: 9,
    gravity: 580,         // Crisp arcade gravity (px/sec^2)
    arcadeBounceImpulse: 540, // 1.5x original baseline bounce (360 * 1.5 = 540 px/s)
    ceilingBounceImpulse: 540,// 1.5x original baseline ceiling rebound (540 px/s)
    groundFriction: 0.98,    // Low horizontal friction to keep arcade pace lively
    travelSpeedRatio: 0.82,  // Rocket normal travel speed set to 82% (18% reduction)
    serveSpeedX: 360,     // Horizontal serve launch speed (81.8% of previous 440)
    serveSpeedY: -160,    // Initial vertical serve arc
    minHorizontalSpeed: 300, // Minimum speed so ball never stalls (83.3% of previous 360)
    maxSpeed: 960,        // Playable and stable max velocity ceiling
    speedMultiplier: 1.03, // Slight rally speed increase per racket return
  },

  racketReturn: {
    // Oval Head (Strings & Frame)
    centerAngleDeg: -10,  // Center hit angle: slight upward arc across the court
    angleSpreadDeg: 26,   // Top hits angle up to (-10 - 26) = -36°, lower head up to (-10 + 26) = +16°
    baseReturnSpeed: 540, // 1.5x original baseline bounce (360 * 1.5 = 540 px/s)
  },

  // Rocket and Hot-Potato Bomb Mechanics
  hotPotato: {
    countdownSeconds: 10.0, // 10-second Rocket rally countdown (unchanged)
    warningThresholdSec: 3.5, // Warning threshold when rocket time is running out
    bombSpeedMultiplier: 1.82, // Challenging sudden-death speed boost (up from 1.68)
    bombFuseDurationSec: 10.0, // Full 10-second Bomb countdown
    runWarningDurationSec: 1.4,// Duration to display prominent RUN! dodge warning
    bombBounceMultiplier: 1.32, // Stronger Bomb ground bounce (1.32x = 712.8 px/s)
    bombCeilingMultiplier: 1.28, // Stronger Bomb ceiling rebound (1.28x = 691.2 px/s)
    bombMinHorizontalSpeed: 420, // Elevated minimum speed for brisk, challenging motion
    bombSideReboundMultiplier: 1.12, // Dynamic side wall rebound impulse multiplier
  },

  ai: {
    reactionDelayMs: 120,     // Simulates human visual reaction latency in Rocket phase (ms)
    bombReactionDelayMs: 80,  // Sharpened crisis reflex during fast Bomb phase (ms)
    tapCooldownMs: 180,       // Minimum time between consecutive jumps in Rocket phase (ms)
    bombTapCooldownMs: 150,   // Agile tap cadence for sustained bomb evasion (ms)
    alignmentTolerance: 20,   // Acceptable vertical distance between racket and ball
    readyHeightY: 340,        // Ready stance hover height while ball is on opponent's side
    mistakeChance: 0.05,      // Small chance to slightly mistime jumps under pressure
    dodgeBombAggression: 0.90,// Tendency to actively avoid incoming sudden-death bomb
  },

  gameplay: {
    pointsToWin: 5,
    serveCountdownMs: 900,
    pointCelebrationMs: 1400,
  },

  diwali: {
    enableFireworks: true,
    enableDiyas: true,
    enableRangoli: true,
  }
};

// Deep clone helper so current config can be safely modified without altering defaults
function createConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

const CONFIG = createConfig();


// --- src/audio.js ---
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

const sound = new SoundSystem();


// --- src/court.js ---
/**
 * Court Module (White-Canvas Presentation)
 * Renders a clean, bright white canvas / paper-like court with an uncluttered
 * play area, sparse black line accents, and crisp boundary markings.
 */

class Court {
  constructor(config) {
    this.config = config;
    this.centerX = config.court.width / 2;
  }

  updateConfig(config) {
    this.config = config;
    this.centerX = config.court.width / 2;
  }

  update(dt) {
    // Uncluttered presentation — no heavy background animations
  }

  draw(ctx) {
    const { width, height, groundY, ceilingY } = this.config.court;

    // 1. Clean, bright white canvas play area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Ceiling boundary: Crisp black line accent with subtle golden corner stops
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(16, ceilingY);
    ctx.lineTo(width - 16, ceilingY);
    ctx.stroke();

    // Subtle golden corner terminal pips
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(16, ceilingY - 3, 5, 6);
    ctx.fillRect(width - 21, ceilingY - 3, 5, 6);
    ctx.restore();

    // 3. Ground Baseline: Crisp black line accent along court ground
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, groundY);
    ctx.lineTo(width - 16, groundY);
    ctx.stroke();

    // 4. Subtle sparse court floor division markings (below groundY)
    const p1BaseX = this.config.court.baselineP1X;
    const p2BaseX = this.config.court.baselineP2X;
    const midX = width / 2;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // P1 baseline indicator tick
    ctx.moveTo(p1BaseX, groundY);
    ctx.lineTo(p1BaseX, groundY + 12);
    // P2 baseline indicator tick
    ctx.moveTo(p2BaseX, groundY);
    ctx.lineTo(p2BaseX, groundY + 12);
    // Center open-court marker tick
    ctx.moveTo(midX, groundY);
    ctx.lineTo(midX, groundY + 16);
    ctx.stroke();

    // Light subtle bottom boundary line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, height - 8);
    ctx.lineTo(width - 24, height - 8);
    ctx.stroke();

    ctx.restore();
  }
}


// --- src/player.js ---
/**
 * Player Entity (White-Canvas Presentation)
 * Controls vertical movement, gravity, impulse taps, boundary clamps,
 * high-contrast festive Diwali attire, and the multi-zone tennis racket
 * (oval head with strings, enlarged sweet spot target zone, and straight cylindrical handle).
 */


class Player {
  /**
   * @param {string} id - 'p1' or 'p2'
   * @param {number} x - Fixed horizontal position
   * @param {boolean} isFacingRight - True for P1, False for P2
   * @param {object} config - Game configuration
   */
  constructor(id, x, isFacingRight, config) {
    this.id = id;
    this.x = x;
    this.isFacingRight = isFacingRight;
    this.config = config;

    // Movement state
    this.width = config.player.width;
    this.height = config.player.height;

    // Start player on the ground
    this.y = config.court.groundY - this.height / 2;
    this.vy = 0;

    // Racket horizontal offset
    this.racketOffsetX = isFacingRight ? config.player.racketOffset : -config.player.racketOffset;

    // Hit & impulse animations
    this.hitEffectTimer = 0;
    this.hitZoneType = null; // 'HEAD' | 'SWEET_SPOT' | 'HANDLE'
    this.jumpSquashTimer = 0;

    // High-contrast festive colors (stand out boldly on white canvas)
    this.kurtaColor = isFacingRight ? '#1d4ed8' : '#be123c'; // Royal Sapphire vs Ruby Crimson
    this.kurtaTrim = '#f59e0b'; // Shimmering Gold
    this.turbanColor = isFacingRight ? '#f97316' : '#e11d48';
    this.shoeColor = '#fbbf24';
  }

  updateConfig(config) {
    this.config = config;
    this.width = config.player.width;
    this.height = config.player.height;
    this.racketOffsetX = this.isFacingRight ? config.player.racketOffset : -config.player.racketOffset;
  }

  reset() {
    this.y = this.config.court.groundY - this.height / 2;
    this.vy = 0;
    this.hitEffectTimer = 0;
    this.hitZoneType = null;
    this.jumpSquashTimer = 0;
  }

  /**
   * Upward vertical impulse when tapping or clicking
   */
  tapJump() {
    this.vy = this.config.player.jumpImpulse;
    this.jumpSquashTimer = 0.14;
    sound.playJump();
  }

  onHitBall(zoneType = 'HEAD') {
    this.hitEffectTimer = 0.18;
    this.hitZoneType = zoneType;
  }

  update(dt) {
    const { gravity, terminalVelocity } = this.config.player;
    const { groundY, ceilingY } = this.config.court;

    // Apply downward gravity
    this.vy += gravity * dt;
    if (this.vy > terminalVelocity) {
      this.vy = terminalVelocity;
    }

    // Update vertical position (strictly vertical movement)
    this.y += this.vy * dt;

    // Keep players strictly within playable court area
    const minY = ceilingY + this.height / 2;
    const maxY = groundY - this.height / 2;

    if (this.y < minY) {
      this.y = minY;
      if (this.vy < 0) this.vy = 0;
    } else if (this.y > maxY) {
      this.y = maxY;
      if (this.vy > 0) this.vy = 0;
    }

    // Decay visual timers
    if (this.hitEffectTimer > 0) {
      this.hitEffectTimer -= dt;
    }
    if (this.jumpSquashTimer > 0) {
      this.jumpSquashTimer -= dt;
    }
  }

  getRacketX() {
    return this.x + this.racketOffsetX;
  }

  /**
   * Racket bounding geometry:
   * 1. Oval Head (Strings & Frame with enlarged sweet-spot target zone)
   * 2. Straight Cylindrical Handle (connected directly to bottom of frame, no V-shaped neck)
   */
  getRacketBounds() {
    const rx = this.getRacketX();
    const r = this.config.racket;
    const headH = r.headHeight; // 52
    const headW = r.headWidth;  // 26
    const handleH = r.handleHeight; // 28
    const handleW = r.handleWidth;  // 8

    // Head is centered slightly above player center
    const headCenterY = this.y - 14;
    const headBottom = headCenterY + headH / 2;
    const handleCenterY = headBottom + handleH / 2;

    return {
      x: rx,
      centerY: this.y,
      head: {
        centerX: rx,
        centerY: headCenterY,
        radiusX: headW / 2,
        radiusY: headH / 2,
        top: headCenterY - headH / 2,
        bottom: headBottom,
        left: rx - headW / 2,
        right: rx + headW / 2,
        width: headW,
        height: headH,
      },
      handle: {
        centerX: rx,
        centerY: handleCenterY,
        top: headBottom,
        bottom: headBottom + handleH,
        left: rx - handleW / 2,
        right: rx + handleW / 2,
        width: handleW,
        height: handleH,
      },
      overall: {
        left: rx - headW / 2,
        right: rx + headW / 2,
        top: headCenterY - headH / 2,
        bottom: headBottom + handleH,
        height: r.totalHeight,
      }
    };
  }

  /**
   * Provides the exact cross-sectional profile and collision geometry at height y
   * matching the visible racket geometry:
   * - Oval Head (Strings & Frame with practical center sweet-spot target zone)
   * - Straight Cylindrical Handle (directly connected to bottom of frame, no neck)
   */
  getRacketProfileAt(y) {
    const rx = this.getRacketX();
    const rb = this.getRacketBounds();

    // 1. Oval Head Zone (Frame & String Bed)
    if (y >= rb.head.top && y <= rb.head.bottom) {
      const dy = (y - rb.head.centerY) / rb.head.radiusY;
      const clampedDy = Math.min(Math.max(dy, -1), 1);
      // Oval half-width at height y (+ 2px frame edge)
      const halfW = rb.head.radiusX * Math.sqrt(Math.max(0, 1 - clampedDy * clampedDy)) + 2;
      const distFromCenter = Math.abs(y - rb.head.centerY);
      const sweetSpotHalf = (this.config.racket.sweetSpotHeight || 18) / 2;
      const isSweetSpot = distFromCenter <= sweetSpotHalf;

      return {
        left: rx - halfW,
        right: rx + halfW,
        width: halfW * 2,
        zone: isSweetSpot ? 'SWEET_SPOT' : 'HEAD',
        centerY: rb.head.centerY,
        radiusY: rb.head.radiusY,
      };
    }

    // 2. Straight Cylindrical Handle Zone (Directly connects to frame bottom, no neck)
    if (y > rb.handle.top && y <= rb.handle.bottom + 3) {
      const isButtCap = y >= rb.handle.bottom - 4;
      const halfW = isButtCap ? 5.5 : (this.config.racket.handleWidth / 2); // 4px shaft, 5.5px butt cap
      return {
        left: rx - halfW,
        right: rx + halfW,
        width: halfW * 2,
        zone: 'HANDLE',
      };
    }

    // Rounded top tip of oval head (within ball radius of top)
    if (y < rb.head.top && y >= rb.head.top - this.config.ball.radius) {
      const dist = rb.head.top - y;
      const halfW = Math.max(1, rb.head.radiusX * 0.45 - dist * 0.5);
      return {
        left: rx - halfW,
        right: rx + halfW,
        width: halfW * 2,
        zone: 'HEAD',
        centerY: rb.head.centerY,
        radiusY: rb.head.radiusY,
      };
    }

    return null;
  }

  draw(ctx, score = 0, displayName = null, isBombPhase = false) {
    const rx = this.getRacketX();
    const groundY = this.config.court.groundY;

    ctx.save();

    // 1. Soft Charcoal Ground Shadow on White Canvas
    const heightAboveGround = (groundY - (this.y + this.height / 2));
    const shadowScale = Math.max(0.3, 1 - heightAboveGround / 420);
    const shadowAlpha = Math.max(0.06, 0.22 * (1 - heightAboveGround / 450));

    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(this.x, groundY + 3, (this.width / 1.5) * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Tennis Racket (Oval Head + Direct Straight Cylindrical Handle)
    this.drawRacket(ctx, rx);

    // 3. Player Character in Festive Diwali Attire & Expressive Silhouette
    this.drawFestiveCharacter(ctx, isBombPhase);

    // 4. Polished overhead character HUD (Role, Score, Power-up Readiness)
    this.drawCharacterUI(ctx, score, displayName, isBombPhase);

    ctx.restore();
  }

  drawCharacterUI(ctx, score, displayName, isBombPhase = false) {
    const isP1 = this.id === 'p1';
    const roleText = displayName || (isP1 ? 'PLAYER 1' : 'CPU');
    const isSuperActive = this.hitEffectTimer > 0 && this.hitZoneType === 'SWEET_SPOT';

    // Position compact floating badge cleanly above player's head, clamped below ceiling
    const badgeX = this.x;
    const badgeY = Math.max(this.config.court.ceilingY + 28, this.y - this.height / 2 - 20);

    ctx.save();
    ctx.translate(badgeX, badgeY);

    const badgeW = 100;
    const badgeH = 24;

    // Clean white card base with soft paper drop shadow
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 12);
    ctx.fill();

    // Reset shadow for crisp borders & text
    ctx.shadowColor = 'transparent';

    // Crisp high-contrast outline with player accent color
    ctx.strokeStyle = isBombPhase ? '#dc2626' : (isSuperActive ? '#f59e0b' : (isP1 ? '#2563eb' : '#dc2626'));
    ctx.lineWidth = (isSuperActive || isBombPhase) ? 2.2 : 1.6;
    ctx.stroke();

    // Player Role / Name
    ctx.font = 'bold 9.5px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(roleText, -badgeW / 2 + 8, 0);

    // Score Pill (Crisp Jewel on White)
    const scoreColor = isP1 ? '#2563eb' : '#dc2626';
    ctx.fillStyle = isP1 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(220, 38, 38, 0.1)';
    ctx.beginPath();
    ctx.roundRect(10, -badgeH / 2 + 3.5, 18, badgeH - 7, 5);
    ctx.fill();
    ctx.strokeStyle = scoreColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 10.5px "Cinzel", Georgia, serif';
    ctx.fillStyle = scoreColor;
    ctx.textAlign = 'center';
    ctx.fillText(score.toString(), 19, 0.5);

    // Power-Up / Phase Indicator (⚡READY / ⚡SUPER! / 💣DODGE!)
    ctx.textAlign = 'right';
    if (isBombPhase) {
      ctx.font = 'bold 8px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.fillText('💣DODGE', badgeW / 2 - 6, 0);
    } else if (isSuperActive) {
      ctx.font = 'bold 8.5px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = '#d97706';
      ctx.fillText('⚡SUPER', badgeW / 2 - 6, 0);
    } else {
      ctx.font = 'bold 8px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText('⚡READY', badgeW / 2 - 6, 0);
    }

    ctx.restore();
  }

  drawRacket(ctx, rx) {
    const rb = this.getRacketBounds();
    const isHitting = this.hitEffectTimer > 0;
    const isSweetSpotHit = isHitting && this.hitZoneType === 'SWEET_SPOT';
    const headHit = (isHitting && this.hitZoneType === 'HEAD') || isSweetSpotHit;

    ctx.save();

    // Dynamic Racket Swing & Follow-through impact animation
    if (isHitting) {
      const swingProgress = this.hitEffectTimer / 0.18;
      const swingAngle = Math.sin(swingProgress * Math.PI) * (this.isFacingRight ? 0.18 : -0.18);
      ctx.translate(rx, rb.handle.centerY);
      ctx.rotate(swingAngle);
      ctx.translate(-rx, -rb.handle.centerY);
    }

    // Arm connection to handle
    ctx.strokeStyle = '#0f172a'; // Arm outline
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const armX = this.x + (this.isFacingRight ? 10 : -10);
    const armY = this.y + 12;
    ctx.beginPath();
    ctx.moveTo(armX, armY);
    ctx.lineTo(rx, rb.handle.centerY);
    ctx.stroke();

    ctx.strokeStyle = '#fed7aa'; // Arm skin
    ctx.lineWidth = 4;
    ctx.stroke();

    // Sporty wristband
    const wristColor = this.isFacingRight ? '#2563eb' : '#dc2626';
    const wristX = armX * 0.35 + rx * 0.65;
    const wristY = armY * 0.35 + rb.handle.centerY * 0.65;
    ctx.strokeStyle = wristColor;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(wristX - 2, wristY - 2);
    ctx.lineTo(wristX + 2, wristY + 2);
    ctx.stroke();

    // 1. Straight Cylindrical Handle (connected directly to bottom of frame, no neck)
    const h = rb.handle;
    const hCX = rx;

    // Cylindrical side gradient
    const cylGrad = ctx.createLinearGradient(h.left, 0, h.right, 0);
    cylGrad.addColorStop(0, '#0f172a');
    cylGrad.addColorStop(0.3, '#334155');
    cylGrad.addColorStop(0.5, '#94a3b8');
    cylGrad.addColorStop(0.8, '#1e293b');
    cylGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = cylGrad;
    ctx.beginPath();
    ctx.roundRect(h.left, h.top, h.width, h.height, 2);
    ctx.fill();

    // Outline for crisp separation from white canvas
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cylindrical tennis grip flared butt-cap at the base
    const buttW = h.width + 3;
    const buttLeft = hCX - buttW / 2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(buttLeft, h.bottom - 4, buttW, 4, 1.5);
    ctx.fill();

    // Golden frame-joint collar ring
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(h.left - 1, h.top - 1, h.width + 2, 3);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(h.left - 1, h.top - 1, h.width + 2, 3);

    // Diagonal spiral grip tape wrap ridges across the cylindrical shaft
    ctx.strokeStyle = this.isFacingRight ? '#3b82f6' : '#ef4444';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let sy = h.top + 3; sy < h.bottom - 4; sy += 3.5) {
      ctx.moveTo(h.left + 0.5, sy);
      ctx.lineTo(h.right - 0.5, sy + 2);
    }
    ctx.stroke();

    // Specular highlight line along cylinder length
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(h.left + 2, h.top + 2);
    ctx.lineTo(h.left + 2, h.bottom - 5);
    ctx.stroke();

    // 2. Oval Head (Frame and Strings with Enlarged Super-Shot Target Zone)
    const hd = rb.head;

    // Outer Frame (Oval) with crisp contrast against white
    const frameColor = this.isFacingRight ? '#2563eb' : '#dc2626';
    const hitFrameColor = isSweetSpotHit ? '#f59e0b' : '#fbbf24';

    // Soft frame fill
    ctx.fillStyle = isSweetSpotHit ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(hd.centerX, hd.centerY, hd.radiusX, hd.radiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Frame stroke: crisp black outline + bold colored frame for high pop
    ctx.lineWidth = isSweetSpotHit ? 5.5 : (headHit ? 4.5 : 3.5);
    ctx.strokeStyle = headHit ? hitFrameColor : frameColor;
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Cross-woven strings in dark charcoal for sharp contrast on white
    ctx.strokeStyle = isSweetSpotHit ? '#d97706' : 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();

    // Vertical strings (longitudinal)
    for (let dx = -hd.radiusX + 4; dx < hd.radiusX; dx += 4) {
      const hAtX = hd.radiusY * Math.sqrt(Math.max(0, 1 - (dx / hd.radiusX) ** 2));
      ctx.moveTo(hd.centerX + dx, hd.centerY - hAtX + 2);
      ctx.lineTo(hd.centerX + dx, hd.centerY + hAtX - 2);
    }

    // Horizontal strings (cross)
    for (let dy = -hd.radiusY + 6; dy < hd.radiusY; dy += 6) {
      const wAtY = hd.radiusX * Math.sqrt(Math.max(0, 1 - (dy / hd.radiusY) ** 2));
      ctx.moveTo(hd.centerX - wAtY + 2, hd.centerY + dy);
      ctx.lineTo(hd.centerX + wAtY - 2, hd.centerY + dy);
    }
    ctx.stroke();

    // 3. Super-Shot Focus Area: Visibly shown as a small, luminous target zone
    const targetW = this.config.racket.sweetSpotWidth || 16;
    const targetH = this.config.racket.sweetSpotHeight || 18;
    const targetLeft = hd.centerX - targetW / 2;
    const targetTop = hd.centerY - targetH / 2;

    // Golden sweet-spot target aperture
    ctx.fillStyle = isSweetSpotHit ? 'rgba(245, 158, 11, 0.35)' : 'rgba(251, 191, 36, 0.2)';
    ctx.beginPath();
    ctx.roundRect(targetLeft, targetTop, targetW, targetH, 4);
    ctx.fill();

    ctx.strokeStyle = isSweetSpotHit ? '#d97706' : '#f59e0b';
    ctx.lineWidth = isSweetSpotHit ? 2 : 1.4;
    ctx.stroke();

    // Corner reticle tick marks on target zone
    const cornerSize = 3.5;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(targetLeft, targetTop + cornerSize);
    ctx.lineTo(targetLeft, targetTop);
    ctx.lineTo(targetLeft + cornerSize, targetTop);
    // Top-right
    ctx.moveTo(targetLeft + targetW - cornerSize, targetTop);
    ctx.lineTo(targetLeft + targetW, targetTop);
    ctx.lineTo(targetLeft + targetW, targetTop + cornerSize);
    // Bottom-left
    ctx.moveTo(targetLeft, targetTop + targetH - cornerSize);
    ctx.lineTo(targetLeft, targetTop + targetH);
    ctx.lineTo(targetLeft + cornerSize, targetTop + targetH);
    // Bottom-right
    ctx.moveTo(targetLeft + targetW - cornerSize, targetTop + targetH);
    ctx.lineTo(targetLeft + targetW, targetTop + targetH);
    ctx.lineTo(targetLeft + targetW, targetTop + targetH - cornerSize);
    ctx.stroke();

    // Center crosshair pip
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(hd.centerX, hd.centerY, isSweetSpotHit ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Sweet spot super-shot starburst cue and expanding impact shockwave ring
    if (isSweetSpotHit) {
      // Expanding golden impact shockwave ring
      const progress = 1 - (this.hitEffectTimer / 0.18);
      const ringRadius = 12 + progress * 24;
      const ringAlpha = (1 - progress) * 0.75;
      ctx.strokeStyle = `rgba(245, 158, 11, ${ringAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(hd.centerX, hd.centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Starburst rays
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(hd.centerX + Math.cos(ang) * 5, hd.centerY + Math.sin(ang) * 5);
        ctx.lineTo(hd.centerX + Math.cos(ang) * 16, hd.centerY + Math.sin(ang) * 16);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawFestiveCharacter(ctx, isBombPhase = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const dir = this.isFacingRight ? 1 : -1;
    const isP1 = this.id === 'p1';
    const isHitting = this.hitEffectTimer > 0;
    const isSweetSpotHit = isHitting && this.hitZoneType === 'SWEET_SPOT';

    // Expressive dynamic squash, stretch, and movement tilt
    let scaleX = 1;
    let scaleY = 1;
    let tiltAngle = 0;
    if (this.jumpSquashTimer > 0) {
      // Crisp athletic launch stretch
      scaleY = 1.18;
      scaleX = 0.86;
      tiltAngle = dir * 0.08;
    } else if (this.vy < -70) {
      // Athletic rising posture
      scaleY = 1.08;
      scaleX = 0.93;
      tiltAngle = dir * 0.05;
    } else if (this.vy > 120) {
      // Landing / descent compression squash
      scaleY = 0.91;
      scaleX = 1.08;
    }
    ctx.rotate(tiltAngle);
    ctx.scale(scaleX, scaleY);

    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // 1. Royal Festive Kurta (Torso)
    ctx.fillStyle = this.kurtaColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 4, -halfH + 18, this.width - 8, halfH + 4, 6);
    ctx.fill();

    // Crisp dark outline for popping against white canvas
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Golden Shimmering Kurta Borders & Angavastram Stole
    ctx.fillStyle = this.kurtaTrim;
    ctx.fillRect(-halfW + 5, -halfH + 18, this.width - 10, 3.5);

    // Diagonal sash with distinctive character accents
    ctx.strokeStyle = isP1 ? '#f59e0b' : '#059669'; // Saffron gold for P1, Emerald silk for P2
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-halfW + 6, -halfH + 20);
    ctx.lineTo(halfW - 6, 12);
    ctx.stroke();

    // Secondary trim line on sash for royal richness
    ctx.strokeStyle = isP1 ? '#fde68a' : '#34d399';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-halfW + 7, -halfH + 21);
    ctx.lineTo(halfW - 7, 11);
    ctx.stroke();

    // 2. Traditional Churidar / Silk Dhoti Pants
    ctx.fillStyle = isP1 ? '#f8fafc' : '#f1f5f9';
    ctx.fillRect(-halfW + 6, 6, this.width - 12, 12);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-halfW + 6, 6, this.width - 12, 12);

    // Legs
    ctx.fillStyle = '#fed7aa'; // Skin
    ctx.fillRect(-8, 18, 5, 12);
    ctx.fillRect(3, 18, 5, 12);
    ctx.strokeRect(-8, 18, 5, 12);
    ctx.strokeRect(3, 18, 5, 12);

    // Festive golden mojari / shoes with curled toe tips
    ctx.fillStyle = this.shoeColor;
    ctx.fillRect(-10, 26, 8, 5);
    ctx.fillRect(2, 26, 8, 5);
    ctx.fillStyle = isP1 ? '#ea580c' : '#991b1b';
    ctx.fillRect(-10, 29, 8, 2);
    ctx.fillRect(2, 29, 8, 2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-10, 26, 8, 5);
    ctx.strokeRect(2, 26, 8, 5);

    // 3. Head & Distinct Festive Turban / Pagri Silhouettes
    const headY = -halfH + 9;
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, headY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Royal Festive Pagri / Turban base
    ctx.fillStyle = this.turbanColor;
    ctx.beginPath();
    ctx.ellipse(0, headY - 4, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Distinct character turban ornaments & silhouettes:
    if (isP1) {
      // P1: Tall upward-sweeping royal Kalgi feather plume silhouette
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(dir * 5, headY - 8);
      ctx.quadraticCurveTo(dir * 8, headY - 20, dir * 4, headY - 24);
      ctx.quadraticCurveTo(dir * 1, headY - 16, dir * 4, headY - 8);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Secondary feather plume ridge
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(dir * 4, headY - 9);
      ctx.quadraticCurveTo(dir * 6, headY - 18, dir * 3.5, headY - 22);
      ctx.lineTo(dir * 4, headY - 9);
      ctx.fill();

      // Plume sapphire gem
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 8, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else {
      // P2: Flared regal crown with emerald peacock aigrette brooch curved to side
      ctx.fillStyle = '#059669'; // Emerald aigrette
      ctx.beginPath();
      ctx.moveTo(dir * 5, headY - 8);
      ctx.quadraticCurveTo(dir * 11, headY - 18, dir * 8, headY - 22);
      ctx.quadraticCurveTo(dir * 3, headY - 16, dir * 4, headY - 8);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Golden aigrette accent
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(dir * 4, headY - 9);
      ctx.quadraticCurveTo(dir * 8, headY - 16, dir * 6, headY - 20);
      ctx.lineTo(dir * 4, headY - 9);
      ctx.fill();

      // Ruby brooch cabochon
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 8, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // 4. Dynamic Facial Expression: Alarmed Dodge vs Starburst Super vs Hit Wink vs Focused Play
    if (isBombPhase) {
      // 💣 BOMB PHASE: High-tension wide alarmed eyes, high arched brow, and panic sweat bead!
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 1, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Dilated alarmed pupil
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(dir * (5 + (dir > 0 ? 0.8 : -0.8)), headY - 1, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // High arched anxious eyebrow
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(dir * 2, headY - 7);
      ctx.lineTo(dir * 7, headY - 6);
      ctx.stroke();

      // Stylized panic sweat bead above brow
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(dir * 9, headY - 9, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Tense focused mouth
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(dir * 2, headY + 5);
      ctx.lineTo(dir * 5, headY + 4);
      ctx.lineTo(dir * 7, headY + 5.5);
      ctx.stroke();
    } else if (isSweetSpotHit) {
      // ⚡ SWEET SPOT HIT: Radiant starburst glint eye and big victorious athletic smile!
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 5, headY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Golden 4-point star in pupil
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      const sx = dir * 5, sy = headY;
      ctx.moveTo(sx, sy - 3);
      ctx.lineTo(sx + 1, sy - 1);
      ctx.lineTo(sx + 3, sy);
      ctx.lineTo(sx + 1, sy + 1);
      ctx.lineTo(sx, sy + 3);
      ctx.lineTo(sx - 1, sy + 1);
      ctx.lineTo(sx - 3, sy);
      ctx.lineTo(sx - 1, sy - 1);
      ctx.closePath();
      ctx.fill();

      // Radiant smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(dir * 3.5, headY + 4.5, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else if (isHitting) {
      // 🎾 NORMAL HIT: Spirited hit wink and athletic exertion smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(dir * 2.5, headY - 2);
      ctx.lineTo(dir * 7.5, headY);
      ctx.lineTo(dir * 2.5, headY + 2);
      ctx.stroke();

      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(dir * 3.5, headY + 5, 3, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (this.vy < -70) {
      // 🚀 RISING JUMP: Keen upward gaze with determined smile
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 1.8, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(dir * 3.5, headY + 4.5, 2.8, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // 🎾 NORMAL PLAY: Athletic focused eye looking forward towards court center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 5, headY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pupil with crisp reflection glint
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(dir * (5 + (dir > 0 ? 0.8 : -0.8)), headY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * (5 + (dir > 0 ? 1.2 : -1.2)), headY - 0.6, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Confident match smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(dir * 3.5, headY + 5, 3, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }
}


// --- src/ball.js ---
/**
 * Ball Entity & Physics Simulation
 * Diwali Edition featuring:
 * 1. Arcade-Style Ground Bouncing (consistent high upward pop, never rolls dead)
 * 2. Multi-Zone Tennis Racket Impact Physics (Oval Head, Curved Throat downward smash, Handle)
 * 3. Rocket-to-Bomb Hot-Potato Sudden Death Mechanics
 */


const BallPhase = {
  ROCKET: 'ROCKET', // Normal rally phase (0 - 10s)
  BOMB: 'BOMB',     // Sudden-death hot potato phase (time <= 0s)
};

class Ball {
  constructor(config) {
    this.config = config;
    this.radius = config.ball.radius;
    this.x = config.court.width / 2;
    this.y = config.court.groundY - 150;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;

    // Hot Potato & Phase State
    this.phase = BallPhase.ROCKET;
    this.lastHitter = null;
    this.inPlay = false;
    this.isServing = false;
    this.hasThroatBoost = false;
    this.bombFuseTimer = 0;
    this.wasGrounded = false;
    this.wasCeilinged = false;
    this.superShotTimer = 0;

    // Visual trails and spark particles
    this.trail = [];
    this.maxTrail = 8;
    this.sparks = [];
    this.hitSparks = [];
    this.bombPulseTime = 0;

    // Rocket fuse-hiss audio timer (emits subtle sizzle while rocket is in flight)
    this.fuseAudioTimer = 0;
  }

  updateConfig(config) {
    this.config = config;
    this.radius = config.ball.radius;
  }

  /**
   * Set up rocket hovering above server's racket at the start of a point
   */
  prepareHover(server, startX, startY) {
    this.x = startX;
    this.y = startY;
    this.radius = this.config.ball.radius;
    this.vx = 0;
    this.vy = 0;
    this.rotation = server === 'p1' ? 0 : Math.PI;
    this.lastHitter = null;
    this.inPlay = false;
    this.isServing = true;
    this.phase = BallPhase.ROCKET;
    this.hasThroatBoost = false;
    this.bombFuseTimer = 0;
    this.wasLeftWalled = false;
    this.wasRightWalled = false;
    this.trail = [];
    this.sparks = [];
    this.hitSparks = [];
    this.wasGrounded = false;
    this.wasCeilinged = false;
    this.superShotTimer = 0;
    this.fuseAudioTimer = 0;
  }

  /**
   * Serve the rocket ball directly (used for direct launches/tests)
   * With bounded variation so serves feel organic within fair limits
   */
  serve(server, startX, startY) {
    this.x = startX;
    this.y = startY;
    this.radius = this.config.ball.radius;
    this.lastHitter = server;
    this.inPlay = true;
    this.isServing = false;
    this.phase = BallPhase.ROCKET;
    this.hasThroatBoost = false;
    this.bombFuseTimer = 0;
    this.wasLeftWalled = false;
    this.wasRightWalled = false;
    this.trail = [];
    this.sparks = [];
    this.hitSparks = [];
    this.wasGrounded = false;
    this.wasCeilinged = false;
    this.superShotTimer = 0;
    this.fuseAudioTimer = 0;

    const dir = server === 'p1' ? 1 : -1;
    // Bounded variation on serve speed (±20 px/s) and vertical launch angle (±20 px/s)
    const speedVariation = (Math.random() - 0.5) * 40;
    const vertVariation = (Math.random() - 0.5) * 30;

    this.vx = (this.config.ball.serveSpeedX + speedVariation) * dir;
    this.vy = this.config.ball.serveSpeedY + vertVariation;

    sound.playRacketHit(0);
  }

  /**
   * Transition projectile from Rocket into Sudden-Death Bomb
   */
  transformToBomb() {
    if (this.phase === BallPhase.BOMB) return;

    this.phase = BallPhase.BOMB;
    this.bombFuseTimer = this.config.hotPotato.bombFuseDurationSec;

    // Apply sudden-death speed multiplier
    const speedMult = this.config.hotPotato.bombSpeedMultiplier;
    this.vx *= speedMult;
    this.vy *= speedMult;

    sound.playBombTransformation();
  }

  /**
   * Main physics update
   * @param {number} dt - delta time
   * @param {import('./court.js').Court} court
   * @param {import('./player.js').Player} p1
   * @param {import('./player.js').Player} p2
   */
  update(dt, court, p1, p2) {
    if (!this.inPlay) return null;

    const prevX = this.x;
    const prevY = this.y;

    this.bombPulseTime += dt * 8;
    if (this.superShotTimer > 0) {
      this.superShotTimer -= dt;
    }

    // Update trail
    this.trail.push({
      x: this.x,
      y: this.y,
      phase: this.phase,
      superShot: this.superShotTimer > 0
    });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    // Spawn sparks
    this.emitSparks(dt);

    // Update existing sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // Update racket impact spark particles
    for (let i = this.hitSparks.length - 1; i >= 0; i--) {
      const hs = this.hitSparks[i];
      hs.x += hs.vx * dt;
      hs.y += hs.vy * dt;
      hs.vy += 120 * dt; // gentle gravity on sparks
      hs.life -= dt;
      if (hs.life <= 0) {
        this.hitSparks.splice(i, 1);
      }
    }

    // Apply gravity
    this.vy += this.config.ball.gravity * dt;

    // Update position: Rocket normal travel speed reduced to roughly 80-85% (82%),
    // while explosive bomb phase moves at full 1.0 ratio with its bomb speed boost.
    const travelRatio = this.phase === BallPhase.ROCKET ? (this.config.ball.travelSpeedRatio ?? 0.82) : 1.0;
    this.x += this.vx * travelRatio * dt;
    this.y += this.vy * dt;

    // Court side boundaries: Rocket clamps if missed; Bomb rebounds with playable speed off left/right walls
    if (this.phase === BallPhase.ROCKET) {
      const minBallX = 10;
      const maxBallX = this.config.court.width - 10;
      if (this.x < minBallX) {
        this.x = minBallX;
        if (this.vx < 0) this.vx = -this.vx * 0.8;
      } else if (this.x > maxBallX) {
        this.x = maxBallX;
        if (this.vx > 0) this.vx = -this.vx * 0.8;
      }
    } else {
      this.checkSideWallBounces();
    }

    // Orientation angle follows flight trajectory
    this.rotation = Math.atan2(this.vy, this.vx);

    // If in BOMB phase: manage sudden-death fuse
    if (this.phase === BallPhase.BOMB) {
      this.bombFuseTimer -= dt;

      // 1. Check if Bomb touches either player or their racket (Touching loses!)
      const bombHitEvent = this.checkBombPlayerCollision(p1, p2);
      if (bombHitEvent) {
        return bombHitEvent;
      }

      // 2. If full 10 seconds expire without either player being hit, award one point to each player
      if (this.bombFuseTimer <= 0) {
        this.bombFuseTimer = 0;
        this.inPlay = false;
        sound.playBombExplosion();
        return {
          type: 'POINT_SCORED',
          scorer: 'both',
          reason: '✨ Both players survived the 10s bomb! (1 point each)'
        };
      }
    } else {
      // ROCKET PHASE: Standard rally mechanics
      // 1. Check Racket Collisions (Head vs Throat vs Handle)
      const racketHitEvent = this.checkRacketCollisions(prevX, prevY, p1, p2);
      if (racketHitEvent) {
        return racketHitEvent;
      }

      // 2. Check Missed Rocket (Point to opponent if ball passes behind racket)
      const missedEvent = this.checkMissedBall(p1, p2);
      if (missedEvent) {
        return missedEvent;
      }
    }

    // Ceiling Bounce: Keeps rocket inside screen with baseline rebound
    this.checkCeilingBounce();

    // Ground Bounce: Arcade-style consistent upward pop
    this.checkGroundBounce();

    return null;
  }

  emitSparks(dt) {
    const isBomb = this.phase === BallPhase.BOMB;
    const sparkCount = isBomb ? 3 : 2;
    for (let i = 0; i < sparkCount; i++) {
      const angle = this.rotation + Math.PI + (Math.random() - 0.5) * 1.2;
      const speed = isBomb ? (60 + Math.random() * 80) : (40 + Math.random() * 50);
      this.sparks.push({
        x: this.x - Math.cos(this.rotation) * (this.radius + 2),
        y: this.y - Math.sin(this.rotation) * (this.radius + 2),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: isBomb ? (Math.random() > 0.5 ? '#ef4444' : '#fbbf24') : '#f59e0b',
        size: 1.5 + Math.random() * 2,
        life: 0.25 + Math.random() * 0.15,
        maxLife: 0.4,
      });
    }

    // Subtle rocket fuse-hiss: emit a soft sizzle sound while rocket is airborne
    if (this.phase === BallPhase.ROCKET && this.inPlay) {
      this.fuseAudioTimer -= dt;
      if (this.fuseAudioTimer <= 0) {
        this.fuseAudioTimer = 0.14;
        sound.playRocketFuseHiss();
      }
    }
  }

  /**
   * Spawns a sharp, electric-yellow sparkle when the racket strikes the projectile.
   * Small, localized, and brief — does not obscure players or rocket.
   * Sweet-spot version is slightly larger but stays in the same electric-yellow palette.
   */
  emitRacketHitSparks(x, y, isSweetSpot = false) {
    // Electric yellow / white palette only — no rainbow colors on hit
    const colors = ['#fef08a', '#ffffff', '#fde047', '#fbbf24'];
    const count = isSweetSpot ? 14 : 9;
    const speedRange = isSweetSpot ? [55, 95] : [35, 65];
    const sizeRange  = isSweetSpot ? [1.2, 2.2] : [0.8, 1.6];
    const lifeRange  = isSweetSpot ? [0.09, 0.13] : [0.07, 0.11];
    const maxLife    = isSweetSpot ? 0.13 : 0.11;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
      this.hitSparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        life: lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]),
        maxLife,
      });
    }
  }

  /**
   * Collision detection matching visible tennis racket geometry:
   * - Oval Head (Strings & Frame): strong energetic return across court
   * - Curved Throat: sharp downward angle, extra downward speed & extra bounce
   * - Handle: baseline deflection
   */
  checkRacketCollisions(prevX, prevY, p1, p2) {
    if (this.vx <= 0) {
      const hit = this.testRacketHit(p1, prevX, prevY, 1);
      if (hit) return hit;
    }
    if (this.vx >= 0) {
      const hit = this.testRacketHit(p2, prevX, prevY, -1);
      if (hit) return hit;
    }
    return null;
  }

  testRacketHit(player, prevX, prevY, returnDir) {
    const rb = player.getRacketBounds();
    const profile = player.getRacketProfileAt(this.y);

    if (!profile) {
      return null;
    }

    // Determine front/back contact surfaces matching visible racket geometry
    // returnDir === 1: P1 facing right, incoming ball from right (vx <= 0)
    // Front surface is profile.right (the outer visible racket edge)
    // returnDir === -1: P2 facing left, incoming ball from left (vx >= 0)
    // Front surface is profile.left
    const frontSurfaceX = returnDir === 1 ? profile.right : profile.left;
    const backSurfaceX = returnDir === 1 ? profile.left : profile.right;

    let hitOccurred = false;

    if (returnDir === 1) {
      // Ball moving left towards P1
      const ballFrontEdge = this.x - this.radius;
      const prevBallFrontEdge = prevX - this.radius;
      const hitBoxLeft = backSurfaceX - this.radius;
      const hitBoxRight = frontSurfaceX + this.radius;

      const inBox = (this.x >= hitBoxLeft && this.x <= hitBoxRight);
      const crossedFront = (prevBallFrontEdge >= frontSurfaceX && ballFrontEdge <= frontSurfaceX);

      if (inBox || crossedFront) {
        hitOccurred = true;
        this.x = frontSurfaceX + this.radius + 1;
      }
    } else {
      // Ball moving right towards P2
      const ballFrontEdge = this.x + this.radius;
      const prevBallFrontEdge = prevX + this.radius;
      const hitBoxLeft = frontSurfaceX - this.radius;
      const hitBoxRight = backSurfaceX + this.radius;

      const inBox = (this.x >= hitBoxLeft && this.x <= hitBoxRight);
      const crossedFront = (prevBallFrontEdge <= frontSurfaceX && ballFrontEdge >= frontSurfaceX);

      if (inBox || crossedFront) {
        hitOccurred = true;
        this.x = frontSurfaceX - this.radius - 1;
      }
    }

    if (!hitOccurred) {
      return null;
    }

    const currentSpeed = Math.hypot(this.vx, this.vy);
    let boostedSpeed = Math.max(this.config.racketReturn.baseReturnSpeed, currentSpeed * this.config.ball.speedMultiplier);

    // Bounded micro-variation on return velocity (±2.5%)
    const speedJitter = 1.0 + (Math.random() - 0.5) * 0.05;
    boostedSpeed *= speedJitter;

    let hitZone = profile.zone;
    let targetAngleDeg = this.config.racketReturn.centerAngleDeg;

    // 1. Center Sweet Spot: Super-shot speed boost with visual cues
    if (hitZone === 'SWEET_SPOT') {
      this.hasThroatBoost = false;
      boostedSpeed *= (this.config.racket.sweetSpotSpeedMultiplier || 1.4);
      this.superShotTimer = 0.8;
      targetAngleDeg = this.config.racketReturn.centerAngleDeg;

      player.onHitBall('SWEET_SPOT');
      sound.playSweetShot();
    }
    // 2. Handle Zone: Low deflected angle
    else if (hitZone === 'HANDLE') {
      this.hasThroatBoost = false;
      targetAngleDeg = 15;
      player.onHitBall('HANDLE');
      sound.playRacketHit(0.5);
    }
    // 3. Oval Head Zone (Strings & Frame): Strong return bounce with position-based angle
    else {
      this.hasThroatBoost = false;
      const relativeOffset = (this.y - rb.head.centerY) / rb.head.radiusY;
      const clampedOffset = Math.min(Math.max(relativeOffset, -1.0), 1.0);
      const { centerAngleDeg, angleSpreadDeg } = this.config.racketReturn;
      targetAngleDeg = centerAngleDeg + (clampedOffset * angleSpreadDeg);

      player.onHitBall('HEAD');
      sound.playRacketHit(clampedOffset);
    }

    // Dynamic racket return variation: vertical movement imparts subtle loft or slice (±3.5°)
    const playerTilt = (player.vy || 0) * 0.008;
    targetAngleDeg += Math.max(-4, Math.min(4, playerTilt));

    const newSpeed = Math.min(boostedSpeed, this.config.ball.maxSpeed);
    const targetAngleRad = (targetAngleDeg * Math.PI) / 180;

    this.vx = returnDir * newSpeed * Math.cos(targetAngleRad);
    this.vy = newSpeed * Math.sin(targetAngleRad);

    this.lastHitter = player.id;
    this.emitRacketHitSparks(this.x, this.y, hitZone === 'SWEET_SPOT');

    return { type: 'RACKET_HIT', player: player.id, zone: hitZone };
  }

  /**
   * Ground Bounce: Arcade-Style Bouncing (1.5x baseline impulse)
   * Rebounds with consistent upward arcade impulse and bounded micro-variation
   * so bounces feel lively, organic, and completely predictable.
   * During Bomb phase: noticeably increased bounce strength and speed
   * so its trajectory changes faster and players have less time to react,
   * while remaining visible, playable, and strictly speed-capped.
   */
  checkGroundBounce() {
    const groundY = this.config.court.groundY;

    if (this.y + this.radius >= groundY) {
      this.y = groundY - this.radius;

      if (!this.wasGrounded && this.vy > 0) {
        if (this.phase === BallPhase.BOMB) {
          // Dynamic Bomb ground bounce: boosted strength (1.32x = ~712 px/s) with controlled variation
          const bombBounceMult = this.config.hotPotato?.bombBounceMultiplier || 1.32;
          const bombVariance = 1.0 + (Math.random() - 0.5) * 0.08;
          const bounceImpulse = this.config.ball.arcadeBounceImpulse * bombBounceMult * bombVariance;
          this.vy = -bounceImpulse;

          // Controlled horizontal variation with elevated minSpeed
          const vxVariation = (Math.random() - 0.5) * 65;
          const minSpeed = this.config.hotPotato?.bombMinHorizontalSpeed || 420;
          const maxSpeed = this.config.ball.maxSpeed || 960;
          const nextVx = Math.sign(this.vx || 1) * (Math.abs(this.vx) * this.config.ball.groundFriction + vxVariation);
          this.vx = Math.sign(nextVx || 1) * Math.min(maxSpeed, Math.max(minSpeed, Math.abs(nextVx)));
        } else {
          // Rocket Phase: strictly preserved 1.5x baseline arcade upward impulse
          const variance = 1.0 + (Math.random() - 0.5) * 0.05;
          let bounceImpulse = this.config.ball.arcadeBounceImpulse * variance;

          this.vy = -bounceImpulse;
          this.vx *= this.config.ball.groundFriction;

          // Ensure horizontal momentum never stalls
          const minSpeed = this.config.ball.minHorizontalSpeed || 360;
          if (Math.abs(this.vx) < minSpeed && this.vx !== 0) {
            this.vx = Math.sign(this.vx) * minSpeed;
          }
        }

        this.wasGrounded = true;
        sound.playBounce(Math.abs(this.vy) / 600);
        return { type: 'GROUND_BOUNCE' };
      }
    } else {
      this.wasGrounded = false;
    }

    return null;
  }

  /**
   * Ceiling Bounce:
   * Keeps projectile within screen boundary with 1.5x baseline rebound strength
   * and deduplicates multi-frame triggers.
   */
  checkCeilingBounce() {
    const ceilingY = this.config.court.ceilingY;

    if (this.y - this.radius <= ceilingY) {
      this.y = ceilingY + this.radius;

      if (!this.wasCeilinged && this.vy < 0) {
        if (this.phase === BallPhase.BOMB) {
          // Dynamic Bomb ceiling bounce: stronger downward rebound (1.28x = ~691 px/s) with bounded variation
          const bombCeilMult = this.config.hotPotato?.bombCeilingMultiplier || 1.28;
          const bombVariance = 1.0 + (Math.random() - 0.5) * 0.08;
          const impulse = (this.config.ball.ceilingBounceImpulse || this.config.ball.arcadeBounceImpulse) * bombCeilMult * bombVariance;
          this.vy = impulse;

          // Controlled bounded horizontal nudge
          const minSpeed = this.config.hotPotato?.bombMinHorizontalSpeed || 420;
          const maxSpeed = this.config.ball.maxSpeed || 960;
          const vxNudge = (Math.random() - 0.5) * 55;
          const nextVx = Math.sign(this.vx || 1) * (Math.abs(this.vx) + vxNudge);
          this.vx = Math.sign(nextVx || 1) * Math.min(maxSpeed, Math.max(minSpeed, Math.abs(nextVx)));
        } else {
          // Rocket Phase: strictly preserved baseline ceiling rebound
          const variance = 1.0 + (Math.random() - 0.5) * 0.04;
          const impulse = (this.config.ball.ceilingBounceImpulse || this.config.ball.arcadeBounceImpulse) * variance;
          this.vy = impulse;
        }

        this.wasCeilinged = true;
        sound.playBounce(0.7);
        return { type: 'CEILING_BOUNCE' };
      }
    } else {
      this.wasCeilinged = false;
    }

    return null;
  }

  /**
   * Bomb Phase: Side-Wall Bounces
   * Bomb bounces dynamically off the court's left and right sides with controlled bounded
   * variation and vertical deflection to prevent repeating predictable trajectories,
   * while strictly capping maximum velocity and preserving playable speed.
   */
  checkSideWallBounces() {
    const minX = this.config.court.minX ?? 10;
    const maxX = this.config.court.maxX ?? (this.config.court.width - 10);
    const minSpeed = this.config.hotPotato?.bombMinHorizontalSpeed ?? 420;
    const maxSpeed = this.config.ball.maxSpeed ?? 960;

    let hitWall = null;
    if (this.x - this.radius <= minX || this.x <= minX) {
      this.x = minX + this.radius;
      if (this.vx < 0) hitWall = 'left';
    } else if (this.x + this.radius >= maxX || this.x >= maxX) {
      this.x = maxX - this.radius;
      if (this.vx > 0) hitWall = 'right';
    }

    if (hitWall) {
      // Dynamic rebound: boosted bounce strength with controlled bounded variation
      const wallMult = this.config.hotPotato?.bombSideReboundMultiplier || 1.12;
      const variance = 1.0 + (Math.random() - 0.5) * 0.08;
      let reboundVx = Math.max(Math.abs(this.vx) * wallMult * variance, minSpeed);

      // Controlled vertical deflection so rebounds don't repeat the exact same static path
      const vyJitter = (Math.random() - 0.5) * 110;
      this.vy += vyJitter;

      // Prevent flat horizontal skimming: if vertical speed is too small, inject purposeful arc deflection
      if (Math.abs(this.vy) < 85) {
        const arcSign = Math.random() > 0.5 ? 1 : -1;
        this.vy = arcSign * (100 + Math.random() * 55);
      }

      // Cap speed within fair playable bounds
      const currentSpeed = Math.hypot(reboundVx, this.vy);
      if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        reboundVx *= scale;
        this.vy *= scale;
      }

      this.vx = hitWall === 'left' ? reboundVx : -reboundVx;
      sound.playBounce(0.75);
      this.emitRacketHitSparks(this.x, this.y);
      return { type: 'WALL_BOUNCE', wall: hitWall };
    }

    return null;
  }

  /**
   * Hot-Potato Bomb Collision Check:
   * If the bomb touches a player or their racket during the 5s phase, that player loses the point.
   */
  checkBombPlayerCollision(p1, p2) {
    const testTouch = (player) => {
      const rb = player.getRacketBounds();
      // Check racket contact
      const racketHit = (
        this.x >= rb.overall.left - this.radius &&
        this.x <= rb.overall.right + this.radius &&
        this.y >= rb.overall.top - this.radius &&
        this.y <= rb.overall.bottom + this.radius
      );
      // Check body contact
      const halfW = player.width / 2;
      const halfH = player.height / 2;
      const bodyHit = (
        this.x >= player.x - halfW - this.radius &&
        this.x <= player.x + halfW + this.radius &&
        this.y >= player.y - halfH - this.radius &&
        this.y <= player.y + halfH + this.radius
      );
      return racketHit || bodyHit;
    };

    if (testTouch(p1)) {
      this.inPlay = false;
      sound.playBombExplosion();
      return {
        type: 'POINT_SCORED',
        scorer: 'p2',
        hitPlayer: 'p1',
        reason: '💥 Bomb touched Player 1! (Point to Player 2)'
      };
    }

    if (testTouch(p2)) {
      this.inPlay = false;
      sound.playBombExplosion();
      const p2Name = this.config.mode === 'PVP' ? 'Player 2' : 'Computer';
      return {
        type: 'POINT_SCORED',
        scorer: 'p1',
        hitPlayer: 'p2',
        reason: `💥 Bomb touched ${p2Name}! (Point to Player 1)`
      };
    }

    return null;
  }

  /**
   * Rocket Phase: Normal missed shot scoring check
   */
  checkMissedBall(p1, p2) {
    const p1Bounds = p1.getRacketBounds();
    const p2Bounds = p2.getRacketBounds();

    if (this.vx < 0 && this.x < p1Bounds.overall.left - this.radius) {
      this.inPlay = false;
      return {
        type: 'POINT_SCORED',
        scorer: 'p2',
        missingPlayer: 'p1',
        missX: this.x,
        missY: this.y,
        missVx: this.vx,
        missVy: this.vy,
        reason: 'Player 1 missed the rocket!'
      };
    }

    if (this.vx > 0 && this.x > p2Bounds.overall.right + this.radius) {
      this.inPlay = false;
      const name = this.config.mode === 'PVP' ? 'Player 2' : 'Computer';
      return {
        type: 'POINT_SCORED',
        scorer: 'p1',
        missingPlayer: 'p2',
        missX: this.x,
        missY: this.y,
        missVx: this.vx,
        missVy: this.vy,
        reason: `${name} missed the rocket!`
      };
    }

    return null;
  }

  draw(ctx) {
    if (!this.inPlay && this.trail.length === 0 && !this.isServing && this.hitSparks.length === 0) return;

    ctx.save();

    // 1. Racket Impact Colorful Sparks
    for (const hs of this.hitSparks) {
      ctx.fillStyle = hs.color;
      ctx.globalAlpha = Math.max(0, hs.life / hs.maxLife);
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, hs.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 2. Motion Trail with Diwali Golden / Ruby glow
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const ratio = (i + 1) / this.trail.length;
      if (p.phase === BallPhase.BOMB) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.25 * ratio})`;
      } else if (p.superShot || this.superShotTimer > 0) {
        ctx.fillStyle = `rgba(245, 158, 11, ${0.35 * ratio})`;
      } else {
        ctx.fillStyle = `rgba(251, 191, 36, ${0.28 * ratio})`;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.radius * ratio * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Sparkling exhaust particles
    for (const sp of this.sparks) {
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 4. Clean Soft Ground Shadow on White Canvas
    const groundY = this.config.court.groundY;
    const heightAboveGround = Math.max(0, groundY - this.y);
    const shadowScale = Math.max(0.2, 1 - heightAboveGround / 420);
    const shadowAlpha = Math.max(0.04, 0.16 * (1 - heightAboveGround / 420));

    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(this.x, groundY + 2, this.radius * 1.5 * shadowScale, 3.5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Render Projectile Body: Rocket vs Sudden-Death Bomb
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.phase === BallPhase.BOMB) {
      this.drawBomb(ctx);
    } else {
      this.drawRocket(ctx);
    }

    ctx.restore();
  }

  drawRocket(ctx) {
    // Diwali Firework Rocket (Bold colors with crisp outline for white canvas)
    // Nose cone (facing flight direction: +X)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(2, -7);
    ctx.lineTo(2, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Rocket cylindrical body
    ctx.fillStyle = '#dc2626'; // Festive crimson
    ctx.fillRect(-10, -5, 12, 10);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-10, -5, 12, 10);

    // Decorative golden band
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-4, -5, 4, 10);
    ctx.strokeRect(-4, -5, 4, 10);

    // Stabilizer tail fins
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(-14, -9);
    ctx.lineTo(-6, -5);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(-14, 9);
    ctx.lineTo(-6, 5);
    ctx.fill();
    ctx.stroke();

    // Fiery exhaust nozzle glow
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-11, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Super-shot glowing energy aura & radiating starburst cue
    if (this.superShotTimer > 0) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 15 + Math.sin(this.superShotTimer * 20) * 2.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI * 2 + this.superShotTimer * 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 6, Math.sin(ang) * 6);
        ctx.lineTo(Math.cos(ang) * 18, Math.sin(ang) * 18);
        ctx.stroke();
      }
    }
  }

  drawBomb(ctx) {
    // Sudden-Death Diwali Bomb
    const pulse = Math.sin(this.bombPulseTime) * 2;

    // Glowing danger warning halo
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Bomb Spherical Body
    const bombGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius + 2);
    bombGrad.addColorStop(0, '#57534e');
    bombGrad.addColorStop(0.6, '#1c1917');
    bombGrad.addColorStop(1, '#0c0a09');

    ctx.fillStyle = bombGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
    ctx.fill();

    // Crisp outline for white background
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Festive woven twine criss-cross / red warning band
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // Golden twine knot & Fuse on top
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-2, -this.radius - 4, 4, 3);
    ctx.strokeRect(-2, -this.radius - 4, 4, 3);

    // Curved burning fuse
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius - 4);
    ctx.quadraticCurveTo(3, -this.radius - 8, 1, -this.radius - 11);
    ctx.stroke();

    // Burning sparkling fuse tip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(1, -this.radius - 11, 2.5 + Math.random(), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(1, -this.radius - 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}


// --- src/ai.js ---
/**
 * Computer Opponent AI (Smarter CPU - Diwali & Hot-Potato Edition)
 * Simulates incoming arcade bounce trajectories, intercepts the rocket during rally play,
 * and actively dodges the sudden-death bomb to win hot-potato points.
 */

class ComputerOpponent {
  constructor(player, config) {
    this.player = player;
    this.config = config;

    this.timeSinceLastDecision = 0;
    this.timeSinceLastTap = 1.0;
    this.targetY = config.court.groundY - 100;
    this.timeUntilArrival = 1.0;
    this.perceivedBall = { x: 0, y: 0, vx: 0, vy: 0, inPlay: false, phase: 'ROCKET' };
  }

  updateConfig(config) {
    this.config = config;
  }

  reset() {
    this.timeSinceLastDecision = 0;
    this.timeSinceLastTap = 1.0;
    this.targetY = this.config.court.groundY - 100;
    this.timeUntilArrival = 1.0;
    this.perceivedBall = { x: 0, y: 0, vx: 0, vy: 0, inPlay: false, phase: 'ROCKET' };
  }

  /**
   * Main AI update called every frame
   */
  update(dt, ball, court) {
    this.timeSinceLastDecision += dt;
    this.timeSinceLastTap += dt;

    const isBomb = (ball && ball.phase === 'BOMB') || this.perceivedBall.phase === 'BOMB';
    const reactionDelay = isBomb
      ? (this.config.ai.bombReactionDelayMs || 80)
      : this.config.ai.reactionDelayMs;
    const reactionSec = reactionDelay / 1000;

    // Snapshot ball state at human reaction interval
    if (this.timeSinceLastDecision >= reactionSec) {
      this.timeSinceLastDecision = 0;
      this.perceivedBall = {
        x: ball.x,
        y: ball.y,
        vx: ball.vx,
        vy: ball.vy,
        inPlay: ball.inPlay,
        phase: ball.phase,
      };

      this.predictTrajectoryAndTarget();
    }

    // Evaluate tap action based on phase (Intercept Rocket vs Dodge Bomb)
    this.evaluateTapAction();
  }

  /**
   * Discrete forward trajectory simulation with arcade ground, ceiling, and side-wall bounce mechanics
   */
  predictTrajectoryAndTarget() {
    if (this.perceivedBall.phase === 'BOMB') {
      this.predictBombTrajectory();
      return;
    }

    const groundY = this.config.court.groundY;
    const racketX = this.player.getRacketX();
    const ballRadius = this.config.ball.radius;
    const ballGravity = this.config.ball.gravity;
    const arcadeBounce = this.config.ball.arcadeBounceImpulse;
    const groundFriction = this.config.ball.groundFriction;

    const ceilingY = this.config.court.ceilingY;
    const minY = this.config.court.ceilingY + this.player.height / 2;
    const maxY = groundY - this.player.height / 2;
    const readyY = Math.min(Math.max(this.config.ai.readyHeightY || 340, minY), maxY);

    // 1. If ball is heading towards P1 or not in play: maintain athletic ready hover
    if (!this.perceivedBall.inPlay || this.perceivedBall.vx <= 0) {
      this.targetY = readyY;
      this.timeUntilArrival = 1.5;
      return;
    }

    // 2. Ball is heading towards CPU (vx > 0)
    const distanceX = racketX - this.perceivedBall.x;
    if (distanceX <= 0) {
      this.targetY = this.player.y;
      this.timeUntilArrival = 0;
      return;
    }

    // Forward simulation with arcade ground & ceiling bounce physics
    let simX = this.perceivedBall.x;
    let simY = this.perceivedBall.y;
    let simVx = this.perceivedBall.vx;
    let simVy = this.perceivedBall.vy;
    let simTime = 0;
    const simDt = 0.014;
    const maxSimTime = 3.5;
    const travelRatio = this.config.ball.travelSpeedRatio ?? 0.82;

    while (simX < racketX && simTime < maxSimTime && simVx > 0) {
      simVy += ballGravity * simDt;
      simX += simVx * travelRatio * simDt;
      simY += simVy * simDt;
      simTime += simDt;

      // Arcade ceiling bounce
      if (simY <= ceilingY + ballRadius) {
        simY = ceilingY + ballRadius;
        simVy = arcadeBounce;
      }

      // Consistent arcade ground bounce
      if (simY >= groundY - ballRadius) {
        simY = groundY - ballRadius;
        simVy = -arcadeBounce;
        simVx *= groundFriction;
      }
    }

    this.timeUntilArrival = simTime;

    // Subtle human error margin
    let errorOffset = 0;
    if (Math.random() < this.config.ai.mistakeChance) {
      errorOffset = (Math.random() - 0.5) * (this.config.ai.alignmentTolerance * 0.8);
    }

    const arrivalY = simY + errorOffset;

    // ROCKET PHASE: Varied tactical intercept strategies
    // 65% sweet-spot drive, 20% upper lob, 15% lower drive
    const stratRoll = Math.random();
    let strategicOffset = 0;
    if (stratRoll < 0.20) {
      strategicOffset = -12; // Aim upper frame for lofted return
    } else if (stratRoll < 0.35) {
      strategicOffset = 10;  // Aim lower frame for fast drive
    } // Else 0: dead-center sweet spot return

    this.targetY = Math.min(Math.max(arrivalY + strategicOffset, minY), maxY);
  }

  /**
   * Bomb Phase: Forward trajectory prediction across 4-wall bounds
   * Predicts incoming bomb passes accounting for dynamic side-wall, ceiling, and ground rebounds.
   */
  predictBombTrajectory() {
    const groundY = this.config.court.groundY;
    const ceilingY = this.config.court.ceilingY;
    const minX = this.config.court.minX ?? 10;
    const maxX = this.config.court.maxX ?? (this.config.court.width - 10);
    const ballRadius = this.config.ball.radius;
    const ballGravity = this.config.ball.gravity;
    const bombBounceMult = this.config.hotPotato?.bombBounceMultiplier || 1.32;
    const arcadeBounce = this.config.ball.arcadeBounceImpulse * bombBounceMult; // Boosted bomb bounce factor
    const groundFriction = this.config.ball.groundFriction;
    const minSpeed = this.config.hotPotato?.bombMinHorizontalSpeed ?? 420;

    const minY = ceilingY + this.player.height / 2;
    const maxY = groundY - this.player.height / 2;

    const cpuX = this.player.x;
    const racketX = this.player.getRacketX();
    const dangerLeft = Math.min(racketX, cpuX) - 36;
    const dangerRight = Math.max(racketX, cpuX) + 36;

    let simX = this.perceivedBall.x;
    let simY = this.perceivedBall.y;
    let simVx = this.perceivedBall.vx;
    let simVy = this.perceivedBall.vy;
    let simTime = 0;
    const simDt = 0.008; // High frequency step for faster bomb velocities
    const maxSimTime = 3.5;

    let predictedArrivalY = null;
    let predictedArrivalTime = 1.0;

    // Check if the bomb is currently already in or immediately adjacent to the danger zone
    if (simX >= dangerLeft && simX <= dangerRight) {
      predictedArrivalY = simY;
      predictedArrivalTime = 0;
    } else {
      while (simTime < maxSimTime) {
        simVy += ballGravity * simDt;
        simX += simVx * simDt;
        simY += simVy * simDt;
        simTime += simDt;

        // Ceiling bounce
        if (simY <= ceilingY + ballRadius) {
          simY = ceilingY + ballRadius;
          simVy = arcadeBounce;
        }

        // Ground bounce
        if (simY >= groundY - ballRadius) {
          simY = groundY - ballRadius;
          simVy = -arcadeBounce;
          simVx *= groundFriction;
          if (Math.abs(simVx) < minSpeed && simVx !== 0) {
            simVx = Math.sign(simVx) * minSpeed;
          }
        }

        // Left wall bounce
        if (simX <= minX + ballRadius) {
          simX = minX + ballRadius;
          simVx = Math.max(Math.abs(simVx), minSpeed);
        }

        // Right wall bounce
        if (simX >= maxX - ballRadius) {
          simX = maxX - ballRadius;
          simVx = -Math.max(Math.abs(simVx), minSpeed);
        }

        // Check if entered danger zone
        if (simX >= dangerLeft && simX <= dangerRight) {
          predictedArrivalY = simY;
          predictedArrivalTime = simTime;
          break;
        }
      }
    }

    this.timeUntilArrival = predictedArrivalTime;

    if (predictedArrivalY !== null) {
      let errorOffset = 0;
      if (Math.random() < this.config.ai.mistakeChance) {
        errorOffset = (Math.random() - 0.5) * (this.config.ai.alignmentTolerance * 0.8);
      }
      const arrivalY = predictedArrivalY + errorOffset;

      // Dynamic evasive dodge strategy for faster, stronger bomb bounces:
      // If bomb arrives low/mid (> 210), jump high to clear the higher bounce!
      // If bomb arrives high (<= 210), duck down to the floor to let it pass safely above!
      if (arrivalY > 210) {
        const dodgeAltOffset = (Math.random() - 0.5) * 16;
        this.targetY = Math.max(minY + 15, 100 + dodgeAltOffset);
      } else {
        this.targetY = maxY;
      }
    } else {
      // If bomb is on P1 side, adopt an agile mid-low ready altitude
      this.targetY = Math.min(maxY, 350);
    }
  }

  evaluateTapAction() {
    const isBomb = this.perceivedBall.phase === 'BOMB';
    const tapCooldownSec = (isBomb ? (this.config.ai.bombTapCooldownMs || 150) : this.config.ai.tapCooldownMs) / 1000;
    if (this.timeSinceLastTap < tapCooldownSec) {
      return;
    }

    const currentY = this.player.y;
    const currentVy = this.player.vy;

    // If in BOMB phase: actively dodge to reach evasion target altitude throughout the phase
    if (isBomb) {
      const maxY = this.config.court.groundY - this.player.height / 2;
      const wantsToStayHigh = this.targetY < maxY - 60;

      // Proximity emergency avoidance across multi-rebounds
      const cpuX = this.player.x;
      const distToBombX = Math.abs(this.perceivedBall.x - cpuX);
      const isBombClose = distToBombX < 145;

      // Continuous dodging: climb towards evasion altitude or maintain hover while bomb is near
      if (wantsToStayHigh) {
        if (currentY > this.targetY + 8 && currentVy >= -85) {
          this.player.tapJump();
          this.timeSinceLastTap = 0;
          return;
        }
        // Hover maintenance while faster bomb is in proximity below
        if (isBombClose && this.perceivedBall.y > 190 && currentVy > 40) {
          this.player.tapJump();
          this.timeSinceLastTap = 0;
          return;
        }
      }

      // Reactive proximity dodge if bomb unexpectedly approaches low or bounces close
      if (isBombClose && this.perceivedBall.y >= currentY - 25 && currentVy >= -85) {
        this.player.tapJump();
        this.timeSinceLastTap = 0;
        return;
      }

      return;
    }

    // In ROCKET phase: capable and responsive rally intercept
    const groundPlayerY = this.config.court.groundY - (this.player.height / 2);
    const groundCoverY = groundPlayerY - (this.config.racket.totalHeight / 2) - this.config.ball.radius + 6;
    const needsJump = this.targetY < groundCoverY;

    if (!needsJump) {
      return; // Ball is low enough that standing on ground intercepts cleanly
    }

    if (this.timeUntilArrival > 0.45) {
      // Early climb for high shots
      if (this.targetY < 320 && currentY > 350 && currentVy >= -80) {
        this.player.tapJump();
        this.timeSinceLastTap = 0;
      }
    } else if (this.timeUntilArrival > 0.16) {
      // Prime intercept window: jump to peak at arrival height
      if (currentY > this.targetY + 4 && currentVy >= -85) {
        this.player.tapJump();
        this.timeSinceLastTap = 0;
      }
    } else {
      // Close range responsive track
      if (currentY > this.targetY + 2 && currentVy >= -60) {
        this.player.tapJump();
        this.timeSinceLastTap = 0;
      }
    }
  }
}


// --- src/controls.js ---
/**
 * Input Controls System
 * Manages independent input bindings for Player 1 and Player 2 across
 * Keyboard, Mouse, and Touch devices (including simultaneous multi-touch support).
 */

class Controls {
  constructor(callbacks = {}) {
    this.onP1Tap = callbacks.onP1Tap || (() => {});
    this.onP2Tap = callbacks.onP2Tap || (() => {});
    this.isPvC = true;

    this.activeKeys = new Set();
    this.initKeyboard();
    this.initTouchAndMouse();
  }

  setMode(isPvC) {
    this.isPvC = isPvC;
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Ignore repeating keys for crisp single impulses per tap
      if (e.repeat) return;

      const key = e.code;

      // Player 1 Keys: W, KeyA, Space (in PvC mode, Space is also P1)
      if (key === 'KeyW' || key === 'KeyA' || (this.isPvC && key === 'Space')) {
        e.preventDefault();
        this.onP1Tap();
      }

      // Player 2 Keys: ArrowUp, Numpad8
      if (key === 'ArrowUp' || key === 'Numpad8') {
        e.preventDefault();
        this.onP2Tap();
      }

      // In PvP mode, Space can be P1 and Enter can be P2
      if (!this.isPvC) {
        if (key === 'Space') {
          e.preventDefault();
          this.onP1Tap();
        } else if (key === 'Enter' || key === 'NumpadEnter') {
          e.preventDefault();
          this.onP2Tap();
        }
      }
    });
  }

  initTouchAndMouse() {
    // Touch/pointer screen split:
    // Left half = Player 1
    // Right half = Player 2 (or P1 anywhere in PvC)
    const courtCanvas = document.getElementById('courtCanvas');
    if (!courtCanvas) return;

    const handlePointerDown = (clientX, clientY) => {
      const rect = courtCanvas.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const width = rect.width;

      if (this.isPvC) {
        // In PvC mode, tapping anywhere on the game canvas moves Player 1
        this.onP1Tap();
      } else {
        // In PvP mode, left half controls P1, right half controls P2
        if (relativeX < width / 2) {
          this.onP1Tap();
        } else {
          this.onP2Tap();
        }
      }
    };

    // Touch events with multi-touch support
    courtCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        handlePointerDown(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    // Mouse click event
    courtCanvas.addEventListener('mousedown', (e) => {
      // Only process primary button
      if (e.button === 0) {
        handlePointerDown(e.clientX, e.clientY);
      }
    });

    // Dedicated on-screen control buttons for mobile/tablet touch
    const p1Btn = document.getElementById('btnTapP1');
    const p2Btn = document.getElementById('btnTapP2');

    if (p1Btn) {
      const triggerP1 = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onP1Tap();
      };
      p1Btn.addEventListener('touchstart', triggerP1, { passive: false });
      p1Btn.addEventListener('mousedown', triggerP1);
    }

    if (p2Btn) {
      const triggerP2 = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onP2Tap();
      };
      p2Btn.addEventListener('touchstart', triggerP2, { passive: false });
      p2Btn.addEventListener('mousedown', triggerP2);
    }
  }
}


// --- src/game.js ---
/**
 * Main Game Controller & State Machine (Diwali Edition)
 * Coordinates Court, Players, Ball, Computer AI, Controls,
 * Hot-Potato 10-second Point Countdown, and Game Flow.
 */








const GameState = {
  MENU: 'MENU',
  SERVING: 'SERVING',
  RALLY: 'RALLY',
  POINT_SCORED: 'POINT_SCORED',
  GAME_OVER: 'GAME_OVER',
};

const GameMode = {
  PVC: 'PVC', // Player vs Computer
  PVP: 'PVP', // Player vs Player
};

/**
 * Full-Canvas Diwali Sky-Rocket Burst — triggered when a point is scored.
 *
 * Stages:
 *   0 – 0.10s : Bright golden-yellow canvas flash (smooth, no strobe)
 *   0.05–1.6s : 90–120 primary particles radiate from burst origin across the full canvas
 *   0.3–2.0s  : 4 secondary sub-bursts scattered across the canvas (20–28 particles each)
 *   after 1.6s: Smooth global alpha fade — back to pure white
 *   ~2.5s     : done = true, effect fully cleared before next point
 */
class DiyaMissEffect {
  constructor(diyaX, diyaY, rocketX, rocketY, rocketVx, rocketVy, side) {
    // Burst origin follows the rocket/ball position
    this.originX = rocketX != null ? rocketX : diyaX;
    this.originY = rocketY != null ? rocketY : diyaY;
    this.timer = 0;
    this.done = false;
    this.particles = [];
    this.subBursts = [];   // { x, y, delay, particles[] }
    this.flashAlpha = 0;

    // ── Primary burst (90–120 particles, wide spread covering full canvas) ──
    const palette = ['#fbbf24', '#f59e0b', '#ef4444', '#facc15', '#ec4899',
                     '#06b6d4', '#fef08a', '#fb923c', '#fde68a', '#a78bfa'];
    const count = 90 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.55;
      const speed = 140 + Math.random() * 320; // wide spread
      const life = 0.75 + Math.random() * 0.75;
      this.particles.push({
        x: this.originX,
        y: this.originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: palette[i % palette.length],
        size: 2.4 + Math.random() * 3.0,
        life,
        maxLife: life,
        trail: [],   // short comet tail
      });
    }

    // ── Secondary sub-bursts (4 scattered positions, staggered in time) ──
    const W = 800, H = 500; // approximate court dimensions
    const subPositions = [
      { x: 0.18 * W, y: 0.22 * H },
      { x: 0.82 * W, y: 0.28 * H },
      { x: 0.35 * W, y: 0.65 * H },
      { x: 0.70 * W, y: 0.55 * H },
    ];
    subPositions.forEach((pos, si) => {
      const delay = 0.30 + si * 0.22 + Math.random() * 0.12;
      const subParticles = [];
      const subCount = 20 + Math.floor(Math.random() * 8);
      for (let i = 0; i < subCount; i++) {
        const angle = (Math.PI * 2 * i) / subCount + (Math.random() - 0.5) * 0.6;
        const speed = 65 + Math.random() * 110;
        const life = 0.45 + Math.random() * 0.4;
        subParticles.push({
          x: pos.x,
          y: pos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: palette[(i + si * 3) % palette.length],
          size: 1.6 + Math.random() * 2.0,
          life,
          maxLife: life,
        });
      }
      this.subBursts.push({ x: pos.x, y: pos.y, delay, particles: subParticles, active: false });
    });

    // (The main sky-rocket sound is played by onRallyEnd via sound.playPointScored.)
  }

  update(dt, groundY) {
    this.timer += dt;

    // Golden canvas flash: peaks at 0.05s, fades by 0.12s
    if (this.timer < 0.12) {
      this.flashAlpha = this.timer < 0.05
        ? (this.timer / 0.05) * 0.55
        : 0.55 * (1 - (this.timer - 0.05) / 0.07);
    } else {
      this.flashAlpha = 0;
    }

    // Primary particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.trail) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 4) p.trail.shift();
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy = p.vy * 0.97 + 85 * dt; // gentle gravity
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Sub-bursts
    for (const sb of this.subBursts) {
      if (!sb.active && this.timer >= sb.delay) {
        sb.active = true;
      }
      if (!sb.active) continue;
      for (let i = sb.particles.length - 1; i >= 0; i--) {
        const p = sb.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 + 70 * dt;
        p.life -= dt;
        if (p.life <= 0) sb.particles.splice(i, 1);
      }
    }

    // Mark done after ~2.5s (always clears well before next point at 3s celebration)
    if (this.timer >= 2.5) {
      this.done = true;
    }
    return !this.done;
  }

  draw(ctx, groundY) {
    if (this.done) return;

    // Global alpha fade-out begins at 1.6s, done by 2.5s
    const globalFade = this.timer < 1.6
      ? 1.0
      : Math.max(0, 1 - (this.timer - 1.6) / 0.9);

    ctx.save();
    ctx.globalAlpha = globalFade;

    // ── Stage 1: Full-canvas golden flash ──
    if (this.flashAlpha > 0.001) {
      ctx.fillStyle = `rgba(254, 240, 138, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // ── Stage 2: Primary burst particles with comet tails ──
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);

      // Draw tail
      if (p.trail && p.trail.length > 1) {
        for (let ti = 0; ti < p.trail.length - 1; ti++) {
          const tAlpha = alpha * (ti / p.trail.length) * 0.4;
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = globalFade * tAlpha;
          ctx.lineWidth = p.size * 0.6 * (ti / p.trail.length);
          ctx.beginPath();
          ctx.moveTo(p.trail[ti].x, p.trail[ti].y);
          ctx.lineTo(p.trail[ti + 1].x, p.trail[ti + 1].y);
          ctx.stroke();
        }
        ctx.globalAlpha = globalFade;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = globalFade * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Stage 3: Secondary sub-burst particles ──
    for (const sb of this.subBursts) {
      if (!sb.active) continue;
      for (const p of sb.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = globalFade * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * alpha), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

class TennisGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.config = createConfig();

    // Canvas internal resolution setup
    this.canvas.width = this.config.court.width;
    this.canvas.height = this.config.court.height;

    // Entities
    this.court = new Court(this.config);
    this.p1 = new Player('p1', this.config.court.baselineP1X, true, this.config);
    this.p2 = new Player('p2', this.config.court.baselineP2X, false, this.config);
    this.ball = new Ball(this.config);
    this.ai = new ComputerOpponent(this.p2, this.config);

    // Game state
    this.mode = GameMode.PVC;
    this.config.mode = GameMode.PVC;
    this.state = GameState.MENU;
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.currentServer = 'p1';
    this.stateTimer = 0;
    this.statusMessage = '';

    // Hot-Potato 10-second Point Countdown & 10-second Bomb Countdown
    this.pointCountdown = this.config.hotPotato.countdownSeconds;
    this.bombCountdown = this.config.hotPotato.bombFuseDurationSec;
    this.lastTickSecond = Math.ceil(this.pointCountdown);
    this.runWarningTimer = 0;
    this.runWarningDuration = this.config.hotPotato.runWarningDurationSec ?? 1.4;

    // Visual miss diya effects and toasts
    this.diyaEffects = [];
    this.briefMessage = '';
    this.briefMessageTimer = 0;
    this.aiServeTapCooldown = 0;

    // Controls
    this.controls = new Controls({
      onP1Tap: () => this.handleP1Action(),
      onP2Tap: () => this.handleP2Action(),
    });

    // Audio & UI bindings
    this.initUI();

    // Animation frame timing
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initUI() {
    const btnPvc = document.getElementById('btnModePvC');
    const btnPvp = document.getElementById('btnModePvP');
    const btnStart = document.getElementById('btnStartMatch');
    const btnRestart = document.getElementById('btnRestart');
    const btnBackToMenu = document.getElementById('btnBackToMenu');
    const btnAudio = document.getElementById('btnToggleAudio');

    if (btnPvc) {
      btnPvc.addEventListener('click', () => this.selectMode(GameMode.PVC));
    }
    if (btnPvp) {
      btnPvp.addEventListener('click', () => this.selectMode(GameMode.PVP));
    }
    if (btnStart) {
      btnStart.addEventListener('click', () => this.startMatch());
    }
    if (btnRestart) {
      btnRestart.addEventListener('click', () => this.startMatch());
    }
    if (btnBackToMenu) {
      btnBackToMenu.addEventListener('click', () => this.openMenu());
    }
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        btnAudio.textContent = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
        btnAudio.classList.toggle('muted', isMuted);
      });
    }

    this.updateHUD();
  }

  openMenu() {
    this.state = GameState.MENU;
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const menuOverlay = document.getElementById('menuOverlay');
    if (gameOverOverlay) gameOverOverlay.style.display = 'none';
    if (menuOverlay) menuOverlay.style.display = 'flex';
  }

  selectMode(mode) {
    this.mode = mode;
    this.config.mode = mode;

    const btnPvc = document.getElementById('btnModePvC');
    const btnPvp = document.getElementById('btnModePvP');

    if (btnPvc && btnPvp) {
      btnPvc.classList.toggle('active', mode === GameMode.PVC);
      btnPvp.classList.toggle('active', mode === GameMode.PVP);
    }

    this.controls.setMode(mode === GameMode.PVC);

    const p2Label = document.getElementById('p2ScoreLabel');
    if (p2Label) {
      p2Label.textContent = mode === GameMode.PVC ? 'CPU' : 'PLAYER 2';
    }

    const p2ControlsHint = document.getElementById('p2ControlsHint');
    if (p2ControlsHint) {
      p2ControlsHint.style.display = mode === GameMode.PVC ? 'none' : 'inline-block';
    }

    const p2TouchBtn = document.getElementById('btnTapP2');
    if (p2TouchBtn) {
      p2TouchBtn.style.display = mode === GameMode.PVC ? 'none' : 'flex';
    }
  }

  startMatch() {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.currentServer = 'p1';
    this.p1.reset();
    this.p2.reset();
    this.ai.reset();

    const menuOverlay = document.getElementById('menuOverlay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    if (menuOverlay) menuOverlay.style.display = 'none';
    if (gameOverOverlay) gameOverOverlay.style.display = 'none';

    this.prepareServe();
    this.updateHUD();
  }

  showBriefMessage(msg, duration = 1.0) {
    this.briefMessage = msg;
    this.briefMessageTimer = duration;
  }

  triggerDiyaMissEffect(missingPlayerId, missX, missY, missVx, missVy) {
    const player = missingPlayerId === 'p1' ? this.p1 : this.p2;
    const side = missingPlayerId === 'p1' ? 'left' : 'right';
    const diyaX = missingPlayerId === 'p1'
      ? Math.max(30, player.x - 48)
      : Math.min(this.config.court.width - 30, player.x + 48);
    const diyaY = Math.min(this.config.court.groundY - 18, Math.max(this.config.court.ceilingY + 60, (missY != null ? missY : player.y) + 10));

    this.diyaEffects.push(new DiyaMissEffect(
      diyaX,
      diyaY,
      missX != null ? missX : (missingPlayerId === 'p1' ? player.x - 20 : player.x + 20),
      missY != null ? missY : player.y,
      missVx != null ? missVx : (missingPlayerId === 'p1' ? -300 : 300),
      missVy != null ? missVy : 0,
      side
    ));
  }

  prepareServe() {
    this.state = GameState.SERVING;
    this.stateTimer = 0.25; // brief grace period before racket collision checks
    this.aiServeTapCooldown = 0.5;
    this.p1.reset();
    this.p2.reset();
    this.ai.reset();

    // Reset 10-second rocket countdown and 10-second bomb countdown
    this.pointCountdown = this.config.hotPotato.countdownSeconds;
    this.bombCountdown = this.config.hotPotato.bombFuseDurationSec;
    this.lastTickSecond = Math.ceil(this.pointCountdown);
    this.runWarningTimer = 0;

    const server = this.currentServer === 'p1' ? this.p1 : this.p2;
    const serverName = this.currentServer === 'p1' ? 'Player 1' : (this.mode === GameMode.PVC ? 'Computer' : 'Player 2');
    this.statusMessage = `${serverName}: Click/Tap to rise and serve!`;

    // Place the rocket slightly above the starting player's racket (~27px above racket head)
    const hoverX = server.getRacketX();
    const hoverY = server.y - 65;
    this.ball.prepareHover(this.currentServer, hoverX, hoverY);
  }

  executeServe() {
    this.state = GameState.RALLY;
    this.statusMessage = '';

    const startX = this.currentServer === 'p1' ? this.p1.getRacketX() + 14 : this.p2.getRacketX() - 14;
    const startY = this.currentServer === 'p1' ? this.p1.y : this.p2.y;

    this.ball.serve(this.currentServer, startX, startY);
  }

  handleP1Action() {
    if (this.state === GameState.MENU || this.state === GameState.GAME_OVER) {
      return;
    }
    this.p1.tapJump();
  }

  handleP2Action() {
    if (this.state === GameState.MENU || this.state === GameState.GAME_OVER) {
      return;
    }
    if (this.mode === GameMode.PVC) return;
    this.p2.tapJump();
  }

  onRallyEnd(reason, scorer) {
    this.state = GameState.POINT_SCORED;
    this.stateTimer = this.config.gameplay.pointCelebrationMs / 1000;
    this.ball.inPlay = false;
    this.runWarningTimer = 0;

    if (scorer === 'p1') {
      this.scoreP1++;
      this.statusMessage = `Point Player 1! ${reason}`;
      sound.playPointScored(true);
    } else if (scorer === 'p2') {
      this.scoreP2++;
      const name = this.mode === GameMode.PVC ? 'CPU' : 'Player 2';
      this.statusMessage = `Point ${name}! ${reason}`;
      sound.playPointScored(false);
    } else if (scorer === 'both') {
      this.scoreP1++;
      this.scoreP2++;
      this.statusMessage = `Point for both! Both survived the bomb!`;
      sound.playPointScored(true);
    }

    this.updateHUD();

    // Alternate server for next point
    this.currentServer = this.currentServer === 'p1' ? 'p2' : 'p1';
  }

  onMatchOver() {
    this.state = GameState.GAME_OVER;
    sound.playMatchWon();

    const isTie = this.scoreP1 === this.scoreP2;
    const winnerName = this.scoreP1 > this.scoreP2
      ? 'PLAYER 1'
      : (this.scoreP2 > this.scoreP1
          ? (this.mode === GameMode.PVC ? 'COMPUTER' : 'PLAYER 2')
          : '');
    const winnerText = document.getElementById('winnerTitle');
    const finalScore = document.getElementById('finalScoreText');
    const gameOverOverlay = document.getElementById('gameOverOverlay');

    if (winnerText) {
      winnerText.textContent = isTie ? '🪔 MATCH TIED! 🪔' : `🪔 ${winnerName} WINS! 🪔`;
    }
    if (finalScore) {
      finalScore.textContent = `Final Score: ${this.scoreP1} - ${this.scoreP2}`;
    }
    if (gameOverOverlay) gameOverOverlay.style.display = 'flex';
  }

  updateHUD() {
    const p1ScoreEl = document.getElementById('scoreP1');
    const p2ScoreEl = document.getElementById('scoreP2');
    if (p1ScoreEl) p1ScoreEl.textContent = this.scoreP1;
    if (p2ScoreEl) p2ScoreEl.textContent = this.scoreP2;

    const hudCard = document.getElementById('hudTimerCard');
    const hudLabel = document.getElementById('hudTimerLabel');
    const hudValue = document.getElementById('hudTimerValue');

    if (hudLabel && hudValue) {
      const isBomb = this.ball && this.ball.phase === 'BOMB';
      if (isBomb) {
        hudLabel.textContent = 'BOMB';
        hudValue.textContent = `${Math.max(0, this.bombCountdown).toFixed(1)}s`;
        if (hudCard) {
          hudCard.className = 'timer-card bomb-phase';
        }
      } else {
        hudLabel.textContent = 'ROCKET';
        hudValue.textContent = `${Math.max(0, this.pointCountdown).toFixed(1)}s`;
        if (hudCard) {
          const isWarning = this.pointCountdown <= (this.config.hotPotato?.warningThresholdSec ?? 3.5);
          hudCard.className = isWarning ? 'timer-card rocket-warning' : 'timer-card';
        }
      }
    }
  }

  gameLoop(currentTime) {
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    const dt = Math.min(rawDt, 0.033);

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    // Decay brief message timer
    if (this.briefMessageTimer > 0) {
      this.briefMessageTimer -= dt;
      if (this.briefMessageTimer <= 0) {
        this.briefMessage = '';
      }
    }

    // Animate court ambient fireworks and diya flickers
    this.court.update(dt);

    // Update players
    this.p1.update(dt);
    this.p2.update(dt);

    if (this.mode === GameMode.PVC && this.state === GameState.RALLY) {
      this.ai.update(dt, this.ball, this.court);
    }

    // State Machine
    switch (this.state) {
      case GameState.SERVING:
        this.stateTimer -= dt;
        const server = this.currentServer === 'p1' ? this.p1 : this.p2;
        const faceDir = this.currentServer === 'p1' ? 1 : -1;

        // Ball hovers slightly above racket (fixed horizontal alignment)
        this.ball.x = server.getRacketX();
        this.ball.rotation = this.currentServer === 'p1' ? 0 : Math.PI;

        // Making contact by jumping up to reach the hovering ball starts the rally
        if (this.stateTimer <= 0) {
          const hit = this.ball.testRacketHit(server, this.ball.x, this.ball.y + 1, faceDir);
          if (hit) {
            this.ball.inPlay = true;
            this.ball.isServing = false;
            this.ball.lastHitter = this.currentServer;
            this.state = GameState.RALLY;
            this.statusMessage = '';
            if (hit.zone === 'SWEET_SPOT') {
              this.showBriefMessage('⚡ SWEET SHOT!', 1.0);
            }
          }

          // AI serve logic: jump up after brief pause to reach hovering ball
          if (this.mode === GameMode.PVC && this.currentServer === 'p2') {
            this.aiServeTapCooldown -= dt;
            if (this.aiServeTapCooldown <= 0 && this.p2.y > this.ball.y + 15) {
              this.p2.tapJump();
              this.aiServeTapCooldown = 0.28;
            }
          }
        }
        break;

      case GameState.RALLY:
        if (this.ball.phase === 'ROCKET') {
          // Hot-Potato 10-second Point Countdown
          this.pointCountdown -= dt;

          // Warning tick audio when under warning threshold in rocket phase
          if (this.pointCountdown <= this.config.hotPotato.warningThresholdSec && this.pointCountdown > 0) {
            const currentSecond = Math.ceil(this.pointCountdown);
            if (currentSecond < this.lastTickSecond) {
              this.lastTickSecond = currentSecond;
              sound.playWarningTick();
            }
          }

          // When 10s countdown reaches 0: Transform into sudden-death Bomb & show RUN! warning!
          if (this.pointCountdown <= 0) {
            this.pointCountdown = 0;
            this.ball.transformToBomb();
            this.bombCountdown = this.config.hotPotato.bombFuseDurationSec;
            this.runWarningTimer = this.runWarningDuration;
          }
        } else {
          // BOMB PHASE: 10-second countdown
          if (this.runWarningTimer > 0) {
            this.runWarningTimer -= dt;
          }
          this.bombCountdown = Math.max(0, this.ball.bombFuseTimer);
        }

        const rallyEvent = this.ball.update(dt, this.court, this.p1, this.p2);
        if (rallyEvent) {
          if (rallyEvent.type === 'RACKET_HIT') {
            if (rallyEvent.zone === 'SWEET_SPOT') {
              this.showBriefMessage('⚡ SWEET SHOT!', 1.0);
            }
          } else if (rallyEvent.type === 'POINT_SCORED') {
            this.onRallyEnd(rallyEvent.reason, rallyEvent.scorer);
            if (rallyEvent.missingPlayer) {
              this.triggerDiyaMissEffect(
                rallyEvent.missingPlayer,
                rallyEvent.missX,
                rallyEvent.missY,
                rallyEvent.missVx,
                rallyEvent.missVy
              );
            } else if (rallyEvent.hitPlayer) {
              this.triggerDiyaMissEffect(
                rallyEvent.hitPlayer,
                this.ball.x,
                this.ball.y,
                this.ball.vx,
                this.ball.vy
              );
            } else {
              // Both survived or general burst
              this.triggerDiyaMissEffect(
                'p1',
                this.ball.x,
                this.ball.y,
                this.ball.vx,
                this.ball.vy
              );
              this.triggerDiyaMissEffect(
                'p2',
                this.ball.x,
                this.ball.y,
                this.ball.vx,
                this.ball.vy
              );
            }
          }
        }
        break;

      case GameState.POINT_SCORED:
        this.stateTimer -= dt;
        // Animate celebratory firecracker burst during point celebration
        this.diyaEffects = this.diyaEffects.filter(e => e.update(dt, this.config.court.groundY));
        if (this.stateTimer <= 0) {
          const winTarget = this.config.gameplay.pointsToWin;
          if (this.scoreP1 >= winTarget || this.scoreP2 >= winTarget) {
            this.onMatchOver();
          } else {
            this.prepareServe();
          }
        }
        break;
    }

    // Keep HUD timers synchronized
    this.updateHUD();
  }

  render() {
    // 1. Draw Court white-canvas background with sparse black line accents
    this.court.draw(this.ctx);

    // 2. Draw Players with multi-zone tennis rackets & festive attire + Clean Character HUD
    const p2DisplayName = this.mode === GameMode.PVC ? 'CPU' : 'PLAYER 2';
    const isBomb = this.ball && this.ball.phase === 'BOMB';
    this.p1.draw(this.ctx, this.scoreP1, 'PLAYER 1', isBomb);
    this.p2.draw(this.ctx, this.scoreP2, p2DisplayName, isBomb);

    // 3. Draw Projectile (Rocket or Sudden-Death Bomb with particles)
    this.ball.draw(this.ctx);

    // 4. Draw Celebratory Firecracker Bursts
    for (const e of this.diyaEffects) {
      e.draw(this.ctx, this.config.court.groundY);
    }

    // 5. Hot-Potato Countdown & Sudden-Death Warning HUD
    if (this.state === GameState.RALLY || this.state === GameState.SERVING) {
      this.renderCountdownHUD();
    }

    // 5B. Prominent RUN! Dodge Warning Banner (when rocket transforms into bomb)
    if (this.runWarningTimer > 0 && this.state === GameState.RALLY) {
      this.renderRunWarning();
    }

    // 6. Brief toast message (Sweet shot, etc.)
    if (this.briefMessage) {
      this.renderBriefMessage();
    }

    // 7. Status banner (Serving / Point scored toasts)
    this.renderStatusOverlay();
  }

  renderBriefMessage() {
    this.ctx.save();
    this.ctx.font = '900 20px "Plus Jakarta Sans", system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const cx = this.config.court.width / 2;
    const cy = 150;

    const textWidth = this.ctx.measureText(this.briefMessage).width;
    const boxW = textWidth + 40;
    const boxH = 40;

    this.ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetY = 3;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 20);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = '#d97706';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#b45309';
    this.ctx.fillText(this.briefMessage, cx, cy);

    this.ctx.restore();
  }

  renderCountdownHUD() {
    this.ctx.save();
    const cx = this.config.court.width / 2;
    const cy = 48;

    const isBomb = this.ball.phase === 'BOMB';
    const isWarning = !isBomb && this.pointCountdown <= this.config.hotPotato.warningThresholdSec;

    let badgeText = '';
    let bgColor = '#ffffff';
    let borderColor = '#0f172a';
    let textColor = '#0f172a';

    if (isBomb) {
      badgeText = `💣 BOMB: ${Math.max(0, this.bombCountdown).toFixed(1)}s — DODGE!`;
      bgColor = '#fee2e2';
      borderColor = '#dc2626';
      textColor = '#991b1b';
    } else if (isWarning) {
      badgeText = `⚠️ ROCKET WARNING: ${Math.max(0, this.pointCountdown).toFixed(1)}s!`;
      bgColor = '#fef3c7';
      borderColor = '#d97706';
      textColor = '#92400e';
    } else {
      badgeText = `🚀 ROCKET: ${Math.max(0, this.pointCountdown).toFixed(1)}s`;
      bgColor = '#ffffff';
      borderColor = '#0f172a';
      textColor = '#0f172a';
    }

    this.ctx.font = 'bold 14px "Plus Jakarta Sans", system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const textWidth = this.ctx.measureText(badgeText).width;
    const boxW = textWidth + 36;
    const boxH = 34;

    this.ctx.shadowColor = 'rgba(15, 23, 42, 0.1)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetY = 3;

    this.ctx.fillStyle = bgColor;
    this.ctx.beginPath();
    this.ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 17);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = textColor;
    this.ctx.fillText(badgeText, cx, cy);

    this.ctx.restore();
  }

  renderRunWarning() {
    if (this.runWarningTimer <= 0) return;

    this.ctx.save();
    const cx = this.config.court.width / 2;
    const cy = 115;

    const warningText = '⚠️ RUN! DODGE THE BOMB! ⚠️';
    this.ctx.font = '900 22px "Plus Jakarta Sans", system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const textWidth = this.ctx.measureText(warningText).width;
    const boxW = textWidth + 48;
    const boxH = 46;

    // Glowing red highlights
    this.ctx.shadowColor = 'rgba(220, 38, 38, 0.55)';
    this.ctx.shadowBlur = 22;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = '#fee2e2';
    this.ctx.beginPath();
    this.ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 23);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = '#dc2626';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    this.ctx.fillStyle = '#b91c1c';
    this.ctx.fillText(warningText, cx, cy);

    this.ctx.restore();
  }

  renderStatusOverlay() {
    if (!this.statusMessage) return;

    this.ctx.save();
    this.ctx.font = 'bold 17px "Plus Jakarta Sans", system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const cx = this.config.court.width / 2;
    const cy = 105;

    const textWidth = this.ctx.measureText(this.statusMessage).width;
    const boxW = textWidth + 40;
    const boxH = 38;

    // Golden festive glow during point celebration
    const isPointScored = this.state === GameState.POINT_SCORED;
    if (isPointScored) {
      this.ctx.shadowColor = '#fbbf24';
      this.ctx.shadowBlur = 28;
      this.ctx.shadowOffsetY = 0;
    } else {
      this.ctx.shadowColor = 'rgba(15, 23, 42, 0.1)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetY = 3;
    }

    this.ctx.fillStyle = isPointScored ? '#fffbeb' : '#ffffff';
    this.ctx.beginPath();
    this.ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 19);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = isPointScored ? '#d97706' : '#0f172a';
    this.ctx.lineWidth = isPointScored ? 2.2 : 1.8;
    this.ctx.stroke();

    this.ctx.fillStyle = isPointScored ? '#92400e' : '#0f172a';
    this.ctx.fillText(this.statusMessage, cx, cy);

    this.ctx.restore();
  }
}



window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new TennisGame('courtCanvas');
});
})();
