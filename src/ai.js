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
