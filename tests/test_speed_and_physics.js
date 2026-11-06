/**
 * Tests for offline physics:
 * 1. Rocket Travel Speed Reduction (80–85% of baseline)
 * 2. Consistent Bounce Strength (540 px/s across racket, ground, ceiling)
 * 3. Preserved Explosive Phase Faster Movement
 */

import assert from 'assert';
import { createConfig } from '../src/config.js';
import { Ball, BallPhase } from '../src/ball.js';

console.log('--- Running Rocket Speed, Bounce Consistency & Explosive Phase Tests ---');

// 1. Rocket Travel Speed Reduction
{
  const config = createConfig();

  // Baseline serve speed was 440; now 360 (approx 81.8% of 440, i.e. 18.2% reduction)
  const serveSpeedXRatio = config.ball.serveSpeedX / 440;
  assert(serveSpeedXRatio >= 0.80 && serveSpeedXRatio <= 0.85,
    `Serve speed ratio must be roughly 80-85% (actual: ${(serveSpeedXRatio * 100).toFixed(1)}%)`);

  // Rocket normal travel speed ratio
  const travelRatio = config.ball.travelSpeedRatio;
  assert(travelRatio >= 0.80 && travelRatio <= 0.85,
    `Travel speed ratio must be roughly 80-85% (actual: ${(travelRatio * 100).toFixed(1)}%)`);

  console.log(`✓ Rocket normal travel speed reduced by ~18% (82% ratio: serveSpeedX=${config.ball.serveSpeedX} px/s, travelRatio=${travelRatio}).`);
}

// 2. Bounce Strength Consistency across Racket, Ground, and Ceiling
{
  const config = createConfig();
  const groundBounce = config.ball.arcadeBounceImpulse;
  const ceilingBounce = config.ball.ceilingBounceImpulse;
  const racketBaseReturn = config.racketReturn.baseReturnSpeed;

  assert.strictEqual(groundBounce, 540, 'Ground bounce impulse must remain exactly 540 px/s');
  assert.strictEqual(ceilingBounce, 540, 'Ceiling bounce impulse must remain exactly 540 px/s');
  assert.strictEqual(racketBaseReturn, 540, 'Racket baseline return must remain exactly 540 px/s');

  console.log('✓ Bounce strength across racket, ground, and ceiling consistently preserved at 540 px/s without retuning.');
}

// 3. Explosive Phase Faster Movement Preserved
{
  const config = createConfig();
  const ball = new Ball(config);
  ball.phase = BallPhase.ROCKET;
  ball.vx = 360;
  ball.vy = -120;
  ball.inPlay = true;

  const normalSpeed = Math.hypot(ball.vx * config.ball.travelSpeedRatio, ball.vy);

  // Transform to bomb
  ball.transformToBomb();
  assert.strictEqual(ball.phase, BallPhase.BOMB);

  const bombSpeed = Math.hypot(ball.vx, ball.vy);
  const ratio = bombSpeed / normalSpeed;

  assert(ratio > 1.4, `Explosive bomb movement must be noticeably faster than normal rocket (actual: ${ratio.toFixed(2)}x faster)`);
  console.log(`✓ Explosive phase speed is ${ratio.toFixed(2)}x faster than normal rocket (faster movement preserved).`);
}

console.log('\nALL PHYSICS TESTS PASSED! 🏆');
