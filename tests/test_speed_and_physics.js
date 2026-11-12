/**
 * Tests for offline physics:
 * 1. Rocket Travel Speed Reduction (80–85% of baseline)
 * 2. Consistent Bounce Strength (540 px/s across racket, ground, ceiling)
 * 3. Preserved Explosive Phase Faster Movement
 */

import assert from 'assert';
import fs from 'fs';
import { createConfig } from '../src/config.js';
import { Ball, BallPhase } from '../src/ball.js';
import { Player } from '../src/player.js';

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

// 4. Dynamic Bomb Rebound Strength & Variation (Rocket-phase strictly preserved)
{
  const config = createConfig();

  // Test Rocket ground bounce: baseline 540 px/s
  const rocket = new Ball(config);
  rocket.phase = BallPhase.ROCKET;
  rocket.y = config.court.groundY - rocket.radius;
  rocket.vy = 200;
  rocket.vx = 350;
  rocket.checkGroundBounce();
  assert(Math.abs(rocket.vy) >= 500 && Math.abs(rocket.vy) <= 570,
    `Rocket bounce must stay strictly around 540 px/s (actual: ${Math.abs(rocket.vy).toFixed(1)})`);

  // Test Bomb ground bounce: noticeably increased dynamic impulse (> 620 px/s)
  const bomb = new Ball(config);
  bomb.phase = BallPhase.BOMB;
  bomb.y = config.court.groundY - bomb.radius;
  bomb.vy = 200;
  bomb.vx = 350;
  bomb.checkGroundBounce();
  const bombGroundVy = Math.abs(bomb.vy);
  assert(bombGroundVy >= 620,
    `Bomb phase must have noticeably increased bounce strength (actual: ${bombGroundVy.toFixed(1)})`);

  // Test speed cap on wall rebound
  bomb.x = config.court.maxX;
  bomb.vx = 1200; // excessively high
  bomb.checkSideWallBounces();
  const bombSpd = Math.hypot(bomb.vx, bomb.vy);
  assert(bombSpd <= config.ball.maxSpeed + 1, `Bomb speed must remain strictly capped below maxSpeed (actual: ${bombSpd.toFixed(1)})`);

  console.log(`✓ Dynamic Bomb rebounds feature boosted bounce strength (${bombGroundVy.toFixed(1)} px/s) and capped speed (<= ${config.ball.maxSpeed} px/s) while Rocket baseline remains unchanged.`);
}

// 5. Controlled, Non-Repeating Variation across Consecutive Bomb Rebounds
{
  const config = createConfig();
  const reboundSamples = [];

  for (let i = 0; i < 5; i++) {
    const bomb = new Ball(config);
    bomb.phase = BallPhase.BOMB;
    bomb.y = config.court.groundY - bomb.radius;
    bomb.vy = 200;
    bomb.vx = 400;
    bomb.checkGroundBounce();
    reboundSamples.push({ vx: bomb.vx, vy: bomb.vy });
  }

  // Verify that not all consecutive rebounds are identical (bounded variation active)
  const allIdentical = reboundSamples.every(s => s.vy === reboundSamples[0].vy && s.vx === reboundSamples[0].vx);
  assert(!allIdentical, 'Bomb rebounds must exhibit controlled variation rather than static repetitive values');

  // Verify bounded limits for harder, faster bounces
  for (const s of reboundSamples) {
    assert(Math.abs(s.vy) >= 620 && Math.abs(s.vy) <= 730, `Rebound vy (${Math.abs(s.vy).toFixed(1)}) within dynamic boosted limits`);
    assert(Math.abs(s.vx) >= 300 && Math.abs(s.vx) <= config.ball.maxSpeed, 'Rebound vx within playable speed limits');
  }

  console.log('✓ Controlled non-repeating bounded variation confirmed across consecutive Bomb rebounds.');
}

// 6. Character Visual Differentiation & Opening Screen Polish Verification
{
  const config = createConfig();
  const p1 = new Player('p1', 110, true, config);
  const p2 = new Player('p2', 890, false, config);

  // Silhouettes & Attire distinction
  assert.notStrictEqual(p1.kurtaColor, p2.kurtaColor, 'P1 and P2 must have distinct royal festive kurta colors');
  assert.notStrictEqual(p1.turbanColor, p2.turbanColor, 'P1 and P2 must have distinct turban colors');
  assert.strictEqual(p1.isFacingRight, true, 'P1 faces right across the court');
  assert.strictEqual(p2.isFacingRight, false, 'P2 faces left across the court');

  // Opening Screen markup validation
  const html = fs.readFileSync('index.html', 'utf8');
  assert(html.includes('MATCH OBJECTIVE'), 'Opening screen must present Match Objective');
  assert(html.includes('First to 5 Points Wins'), 'Opening screen must state match winning condition');
  assert(html.includes('btnModePvC') && html.includes('btnModePvP'), 'Both game mode buttons present');
  assert(html.includes('SOLO') && html.includes('2-PLAYER'), 'Mode badges present');
  assert(html.includes('Phase 1') && html.includes('Phase 2'), 'Two-phase game flow clearly documented');
  assert(html.includes('mobile-controls-hint'), 'Mobile / touch controls hint present');

  console.log('✓ Visual distinction (attire & silhouettes) and opening screen Polish verified.');
}

console.log('\nALL PHYSICS TESTS PASSED! 🏆');
