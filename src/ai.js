/**
 * Computer Opponent AI (Smarter CPU - Diwali & Hot-Potato Edition)
 * Simulates incoming arcade bounce trajectories, intercepts the rocket during rally play,
 * and actively dodges the sudden-death bomb to win hot-potato points.
 */

export class ComputerOpponent {
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

    const reactionSec = this.config.ai.reactionDelayMs / 1000;

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
   * Discrete forward trajectory simulation with arcade ground bounce mechanics
   */
  predictTrajectoryAndTarget() {
    const groundY = this.config.court.groundY;
    const racketX = this.player.getRacketX();
    const ballRadius = this.config.ball.radius;
    const ballGravity = this.config.ball.gravity;
    const arcadeBounce = this.config.ball.arcadeBounceImpulse;
    const groundFriction = this.config.ball.groundFriction;

    const ceilingY = this.config.court.ceilingY;
    const minY = this.config.court.ceilingY + this.player.height / 2;
    const maxY = groundY - this.player.height / 2;

    // 1. If ball is heading towards P1 or not in play
    if (!this.perceivedBall.inPlay || this.perceivedBall.vx <= 0) {
      this.targetY = maxY;
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
    const travelRatio = this.perceivedBall.phase === 'ROCKET' ? (this.config.ball.travelSpeedRatio ?? 0.82) : 1.0;

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

    // Phase-specific behavior with organic bounded variation:
    if (this.perceivedBall.phase === 'BOMB') {
      // HOT POTATO BOMB PHASE: CPU actively DODGES to avoid touching bomb!
      // If bomb arrives low/mid, jump high to let it pass below!
      // If bomb arrives high, duck to the floor to let it pass above!
      if (arrivalY > 280) {
        // Bounded evasion altitude variance (120px - 160px)
        const dodgeAltOffset = (Math.random() - 0.5) * 30;
        this.targetY = Math.max(minY + 20, minY + 40 + dodgeAltOffset);
      } else {
        this.targetY = maxY; // Stay low on ground
      }
    } else {
      // ROCKET PHASE: Varied intercept strategies within fair limits
      // Randomly choose tactical alignment:
      // 65% sweet spot target, 20% upper lob, 15% lower drive
      const stratRoll = Math.random();
      let strategicOffset = 0;
      if (stratRoll < 0.20) {
        strategicOffset = -12; // Aim upper frame for lofted return
      } else if (stratRoll < 0.35) {
        strategicOffset = 10;  // Aim lower frame for fast drive
      } // Else 0: dead-center sweet spot return

      this.targetY = Math.min(Math.max(arrivalY + strategicOffset, minY), maxY);
    }
  }

  evaluateTapAction() {
    const tapCooldownSec = this.config.ai.tapCooldownMs / 1000;
    if (this.timeSinceLastTap < tapCooldownSec) {
      return;
    }

    const currentY = this.player.y;
    const currentVy = this.player.vy;
    const isBallApproaching = this.perceivedBall.inPlay && this.perceivedBall.vx > 0;

    if (!isBallApproaching) {
      return;
    }

    // If in BOMB phase: actively dodge to reach evasion target altitude
    if (this.perceivedBall.phase === 'BOMB') {
      if (currentY > this.targetY + 20 && currentVy >= -120) {
        this.player.tapJump();
        this.timeSinceLastTap = 0;
      }
      return;
    }

    // In ROCKET phase: rally intercept
    const groundPlayerY = this.config.court.groundY - (this.player.height / 2);
    const groundCoverY = groundPlayerY - (this.config.racket.totalHeight / 2) - this.config.ball.radius + 6;
    const needsJump = this.targetY < groundCoverY;

    if (!needsJump) {
      return; // Ball is low enough that standing on ground intercepts cleanly
    }

    if (this.timeUntilArrival > 0.55) {
      // Early climb for very high shots
      if (this.targetY < 280 && currentY > 380 && currentVy >= -100) {
        this.player.tapJump();
        this.timeSinceLastTap = 0;
      }
    } else {
      // Intercept window: jump to peak at arrival height
      if (currentY > this.targetY + 8 && currentVy >= -100) {
        this.player.tapJump();
        this.timeSinceLastTap = 0;
      }
    }
  }
}
