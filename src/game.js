/**
 * Main Game Controller & State Machine (Diwali Edition)
 * Coordinates Court, Players, Ball, Computer AI, Controls,
 * Hot-Potato 10-second Point Countdown, and Game Flow.
 */

import { createConfig } from './config.js';
import { Court } from './court.js';
import { Player } from './player.js';
import { Ball } from './ball.js';
import { ComputerOpponent } from './ai.js';
import { Controls } from './controls.js';
import { sound } from './audio.js';

export const GameState = {
  MENU: 'MENU',
  SERVING: 'SERVING',
  RALLY: 'RALLY',
  POINT_SCORED: 'POINT_SCORED',
  GAME_OVER: 'GAME_OVER',
};

export const GameMode = {
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

export class TennisGame {
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
