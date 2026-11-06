/**
 * Ball Entity & Physics Simulation
 * Diwali Edition featuring:
 * 1. Arcade-Style Ground Bouncing (consistent high upward pop, never rolls dead)
 * 2. Multi-Zone Tennis Racket Impact Physics (Oval Head, Curved Throat downward smash, Handle)
 * 3. Rocket-to-Bomb Hot-Potato Sudden Death Mechanics
 */

import { sound } from './audio.js';

export const BallPhase = {
  ROCKET: 'ROCKET', // Normal rally phase (0 - 10s)
  BOMB: 'BOMB',     // Sudden-death hot potato phase (time <= 0s)
};

export class Ball {
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

    // Fixed court boundary clamping (prevent rocket from leaving playable area)
    const minBallX = 10;
    const maxBallX = this.config.court.width - 10;
    if (this.x < minBallX) {
      this.x = minBallX;
      if (this.vx < 0) this.vx = -this.vx * 0.8;
    } else if (this.x > maxBallX) {
      this.x = maxBallX;
      if (this.vx > 0) this.vx = -this.vx * 0.8;
    }

    // Orientation angle follows flight trajectory
    this.rotation = Math.atan2(this.vy, this.vx);

    // If in BOMB phase: manage sudden-death fuse
    if (this.phase === BallPhase.BOMB) {
      this.bombFuseTimer -= dt;

      // 1. Check if Bomb touches either player or their racket (Hot potato rule: touching loses!)
      const bombHitEvent = this.checkBombPlayerCollision(p1, p2);
      if (bombHitEvent) {
        return bombHitEvent;
      }

      // 2. Check if a player avoided the bomb (bomb passes behind them without touching)
      const avoidedEvent = this.checkBombAvoided(p1, p2);
      if (avoidedEvent) {
        return avoidedEvent;
      }

      // 3. If fuse expires without contact, award the point to the player who avoided it
      if (this.bombFuseTimer <= 0) {
        this.inPlay = false;
        sound.playBombExplosion();
        const side = this.x < court.centerX ? 'p1' : 'p2';
        const scorer = side; // The player on this side avoided contact with the bomb!
        const scorerName = scorer === 'p1' ? 'Player 1' : (this.config.mode === 'PVP' ? 'Player 2' : 'Computer');
        return {
          type: 'POINT_SCORED',
          scorer,
          reason: `✨ ${scorerName} avoided the bomb detonation! (Point to ${scorerName})`
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
   */
  checkGroundBounce() {
    const groundY = this.config.court.groundY;

    if (this.y + this.radius >= groundY) {
      this.y = groundY - this.radius;

      if (!this.wasGrounded && this.vy > 0) {
        // 1.5x baseline arcade upward impulse with bounded micro-variation (±2.5%)
        const variance = 1.0 + (Math.random() - 0.5) * 0.05;
        let bounceImpulse = this.config.ball.arcadeBounceImpulse * variance;

        this.vy = -bounceImpulse;
        this.vx *= this.config.ball.groundFriction;
        this.wasGrounded = true;

        sound.playBounce(Math.abs(this.vy) / 600);

        // Ensure horizontal momentum never stalls
        const minSpeed = this.config.ball.minHorizontalSpeed || 360;
        if (Math.abs(this.vx) < minSpeed && this.vx !== 0) {
          this.vx = Math.sign(this.vx) * minSpeed;
        }

        return { type: 'GROUND_BOUNCE' };
      }
    } else {
      this.wasGrounded = false;
    }

    return null;
  }

  /**
   * Ceiling Bounce:
   * Keeps rocket within screen boundary with 1.5x baseline rebound strength
   * and deduplicates multi-frame triggers.
   */
  checkCeilingBounce() {
    const ceilingY = this.config.court.ceilingY;

    if (this.y - this.radius <= ceilingY) {
      this.y = ceilingY + this.radius;

      if (!this.wasCeilinged && this.vy < 0) {
        const variance = 1.0 + (Math.random() - 0.5) * 0.04;
        const impulse = (this.config.ball.ceilingBounceImpulse || this.config.ball.arcadeBounceImpulse) * variance;
        this.vy = impulse; // Downward rebound with baseline strength
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
   * Hot-Potato Bomb Collision Check:
   * "If the bomb touches a player or their racket, or detonates on their side, that player loses the point."
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
        reason: `💥 Bomb touched ${p2Name}! (Point to Player 1)`
      };
    }

    return null;
  }

  /**
   * Hot-Potato Bomb Avoidance Check:
   * "If a player avoids the bomb and it passes or detonates without touching them, award that player the point."
   */
  checkBombAvoided(p1, p2) {
    const p1Bounds = p1.getRacketBounds();
    const p2Bounds = p2.getRacketBounds();

    // Bomb passed past Player 1 without touching them -> Player 1 successfully avoided it!
    if (this.vx < 0 && this.x < p1Bounds.overall.left - this.radius - 8) {
      this.inPlay = false;
      sound.playBombExplosion();
      return {
        type: 'POINT_SCORED',
        scorer: 'p1',
        reason: '✨ Player 1 avoided the bomb! (Point to Player 1)'
      };
    }

    // Bomb passed past Player 2 without touching them -> Player 2 successfully avoided it!
    if (this.vx > 0 && this.x > p2Bounds.overall.right + this.radius + 8) {
      this.inPlay = false;
      sound.playBombExplosion();
      const p2Name = this.config.mode === 'PVP' ? 'Player 2' : 'Computer';
      return {
        type: 'POINT_SCORED',
        scorer: 'p2',
        reason: `✨ ${p2Name} avoided the bomb! (Point to ${p2Name})`
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
