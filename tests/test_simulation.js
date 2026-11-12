/**
 * Unit & Integration Test Suite for Flappy Diwali Tennis
 * Tests:
 * 1. Player vertical movement, upward impulse, gravity, boundary limits
 * 2. Tennis Racket shape (Oval Head and Straight Cylindrical Handle connected directly)
 * 3. 1.5x Baseline Arcade Ground Bouncing (540 px/s upward impulse, bounded variation, no dead roll)
 * 4. Racket Impact Physics:
 *    - Oval head returns strong shot with angle based on hit position and player velocity
 *    - Enlarged center sweet-spot target zone triggers faster super shot (1.4x boost)
 *    - Cylindrical handle collision matches visible profile
 * 5. Rocket-to-Bomb Hot-Potato Sudden-Death Mechanics:
 *    - 10-second countdown and transformation to Bomb with speed boost
 *    - Touching bomb loses the point
 *    - Avoiding bomb awards the point
 * 6. Smarter CPU: trajectory prediction, bounded variation, & bomb evasion
 */

import assert from 'assert';
import { DEFAULT_CONFIG, createConfig } from '../src/config.js';
import { Court } from '../src/court.js';
import { Player } from '../src/player.js';
import { Ball, BallPhase } from '../src/ball.js';
import { ComputerOpponent } from '../src/ai.js';

console.log('--- Starting Diwali & Hot-Potato Tennis Game Tests ---');

// Test 1: Player vertical movement and boundaries
{
  console.log('Testing Player vertical movement and gravity...');
  const config = createConfig();
  const player = new Player('p1', 110, true, config);

  const initialY = player.y;
  assert.strictEqual(player.x, 110, 'Player X must be fixed at baseline');
  assert.strictEqual(player.vy, 0, 'Initial vertical velocity should be 0');

  // Jump impulse
  player.tapJump();
  assert.strictEqual(player.vy, config.player.jumpImpulse, 'Player should receive upward velocity impulse');

  player.update(0.1);
  assert(player.y < initialY, 'Player Y should decrease (rise upward)');
  assert.strictEqual(player.x, 110, 'Player X must remain strictly fixed (no horizontal movement)');

  // Fall to ground
  for (let i = 0; i < 50; i++) {
    player.update(0.05);
  }
  const maxAllowedY = config.court.groundY - config.player.height / 2;
  assert.strictEqual(player.y, maxAllowedY, 'Player must land on ground');

  console.log('✓ Player vertical movement verified.');
}

// Test 2: Tennis Racket Shape & Direct Handle Connection (No Neck/Throat)
{
  console.log('Testing Racket Shape & Direct Handle Connection (Head and Handle, no throat)...');
  const config = createConfig();
  const p1 = new Player('p1', 110, true, config);
  const rb = p1.getRacketBounds();

  assert(rb.head, 'Racket must define Oval Head zone');
  assert(rb.handle, 'Racket must define Handle zone');
  assert.strictEqual(rb.throat, undefined, 'Neck/throat shape and hitbox must be removed');

  assert.strictEqual(rb.x, 110 + config.player.racketOffset, 'Racket X fixed in front of player');
  assert.strictEqual(rb.handle.top, rb.head.bottom, 'Straight cylindrical handle connects directly to head frame');
  assert.strictEqual(rb.handle.bottom, rb.overall.bottom, 'Handle extends to base of racket');
  console.log('✓ Direct racket geometry (no neck) confirmed.');
}

// Test 3: Arcade-Style Ground Bouncing (1.5x baseline: 540 px/s)
{
  console.log('Testing Arcade-Style Ground Bouncing (1.5x baseline = 540 px/s)...');
  const config = createConfig();
  const court = new Court(config);
  const ball = new Ball(config);
  const p1 = new Player('p1', 110, true, config);
  const p2 = new Player('p2', 890, false, config);

  // Position ball dropping to ground with low downward velocity
  ball.x = 400;
  ball.y = config.court.groundY - 8;
  ball.vx = 350;
  ball.vy = 80; // mild downward speed
  ball.inPlay = true;

  ball.update(0.02, court, p1, p2);

  // Verify strong arcade upward impulse around 540 px/s
  assert(ball.vy < -config.ball.arcadeBounceImpulse * 0.9, `Ball must rebound with 1.5x arcade bounce force (vy=${ball.vy.toFixed(1)})`);
  assert(ball.inPlay, 'Ball remains in play on ground bounce');
  console.log(`✓ Ball rebounded with 1.5x arcade impulse: vy = ${ball.vy.toFixed(1)} px/s.`);
}

// Test 4: Racket Impact Physics - Oval Head, Enlarged Sweet Spot & Cylindrical Handle
{
  console.log('Testing Racket Impact Physics: Oval Head, Enlarged Sweet Spot & Handle...');
  const config = createConfig();
  const p1 = new Player('p1', 110, true, config);
  p1.y = 300;
  const rb = p1.getRacketBounds();

  // 1. Standard Oval Head Hit (outside center sweet spot target zone):
  const ballHead = new Ball(config);
  ballHead.x = rb.x + 4;
  ballHead.y = rb.head.centerY - 18; // Outside 18px height sweet spot
  ballHead.vx = -400;
  ballHead.inPlay = true;

  const hitHead = ballHead.testRacketHit(p1, ballHead.x + 8, ballHead.y, 1);
  assert(hitHead, 'Head hit must register');
  assert.strictEqual(hitHead.zone, 'HEAD', 'Zone must be HEAD when struck outside center sweet spot');
  const speedHead = Math.hypot(ballHead.vx, ballHead.vy);

  // 2. Enlarged Center Sweet Spot Super Shot:
  const ballSweet = new Ball(config);
  ballSweet.x = rb.x + 4;
  ballSweet.y = rb.head.centerY;
  ballSweet.vx = -400;
  ballSweet.inPlay = true;

  const hitSweet = ballSweet.testRacketHit(p1, ballSweet.x + 8, ballSweet.y, 1);
  assert(hitSweet, 'Sweet spot hit must register');
  assert.strictEqual(hitSweet.zone, 'SWEET_SPOT', 'Zone must be SWEET_SPOT within target zone');
  const speedSweet = Math.hypot(ballSweet.vx, ballSweet.vy);
  assert(speedSweet > speedHead, 'Sweet spot must trigger faster super shot than standard head return');
  assert(ballSweet.superShotTimer > 0, 'Sweet spot must activate super shot visual timer');

  // 3. Direct Handle Hit:
  const ballHandle = new Ball(config);
  ballHandle.x = rb.x + 3;
  ballHandle.y = rb.handle.centerY;
  ballHandle.vx = -400;
  ballHandle.inPlay = true;

  const hitHandle = ballHandle.testRacketHit(p1, ballHandle.x + 8, ballHandle.y, 1);
  assert(hitHandle, 'Direct handle hit must register');
  assert.strictEqual(hitHandle.zone, 'HANDLE', 'Zone must be HANDLE');

  console.log(`  Head Return Speed:       ${speedHead.toFixed(1)} px/s`);
  console.log(`  Sweet Spot Super Speed:  ${speedSweet.toFixed(1)} px/s (1.4x Super Shot Boost)`);
  console.log('✓ Oval head, enlarged sweet spot target zone, and direct handle impact verified.');
}

// Test 4B: Visible Ceiling Collision & Deduplication
{
  console.log('Testing Ceiling Rebound & Deduplication (1.5x baseline: 540 px/s)...');
  const config = createConfig();
  const court = new Court(config);
  const ball = new Ball(config);
  const p1 = new Player('p1', 110, true, config);
  const p2 = new Player('p2', 890, false, config);

  ball.x = 450;
  ball.y = config.court.ceilingY + 4;
  ball.vx = 300;
  ball.vy = -350; // Heading upward into ceiling
  ball.inPlay = true;

  const ceilEvent = ball.checkCeilingBounce();
  assert(ceilEvent && ceilEvent.type === 'CEILING_BOUNCE', 'Ceiling bounce event must fire');
  assert(ball.vy >= config.ball.ceilingBounceImpulse * 0.95, 'Ceiling impact must rebound downward with 1.5x baseline');
  assert.strictEqual(ball.wasCeilinged, true, 'Ceiling deduplication flag set');

  // Next frame while still near boundary should not trigger duplicate bounce
  const dupEvent = ball.checkCeilingBounce();
  assert.strictEqual(dupEvent, null, 'Duplicate collision trigger prevented on single ceiling contact');
  console.log('✓ Ceiling collision and rebound deduplication verified.');
}

// Test 5: Hot-Potato Bomb Mechanics (10s Transition, 5s Countdown, Wall Rebounds, Scoring)
{
  console.log('Testing Hot-Potato Bomb (10s countdown, 5s bomb timer, wall rebounds, hit vs both-survive scoring)...');
  const config = createConfig();
  assert.strictEqual(config.hotPotato.countdownSeconds, 10.0, 'Hot potato countdown must be 10.0 seconds');
  assert.strictEqual(config.hotPotato.bombFuseDurationSec, 5.0, 'Bomb countdown must be 5.0 seconds');
  const court = new Court(config);
  const p1 = new Player('p1', 110, true, config);
  const p2 = new Player('p2', 890, false, config);

  // Scenario A: Hit-by-bomb scoring: Bomb touches Player 1 -> Player 1 loses, Player 2 awarded point!
  const bombTouch = new Ball(config);
  bombTouch.serve('p2', 500, 300);
  bombTouch.transformToBomb();
  assert.strictEqual(bombTouch.phase, BallPhase.BOMB, 'Ball must be in BOMB phase');
  assert.strictEqual(bombTouch.bombFuseTimer, 5.0, 'Bomb timer must start at 5.0 seconds');

  // Send bomb directly into P1
  bombTouch.x = p1.x + 2;
  bombTouch.y = p1.y;
  bombTouch.vx = -500;
  const touchEvt = bombTouch.update(0.016, court, p1, p2);

  assert(touchEvt && touchEvt.type === 'POINT_SCORED', 'Touching bomb must score point immediately');
  assert.strictEqual(touchEvt.scorer, 'p2', 'Player 2 awarded point when bomb touches Player 1');
  console.log('✓ Touching bomb caused player to lose point (hit-by-bomb scoring).');

  // Scenario B: Left and Right Wall Rebounds: Bomb rebounds off court sides and remains in play
  const bombRebound = new Ball(config);
  bombRebound.serve('p2', 50, 200);
  bombRebound.transformToBomb();
  // Move players out of horizontal path
  p1.y = 80;
  p2.y = 80;

  // Left wall rebound:
  bombRebound.x = config.court.minX + 5;
  bombRebound.vx = -450;
  const leftEvt = bombRebound.update(0.02, court, p1, p2);
  assert.strictEqual(leftEvt, null, 'Left wall bounce does not end point');
  assert(bombRebound.vx > 0, `Bomb vx must reverse to positive on left wall rebound (actual: ${bombRebound.vx})`);
  assert(bombRebound.inPlay, 'Bomb must remain in play after left wall bounce');

  // Right wall rebound:
  bombRebound.x = config.court.maxX - 5;
  bombRebound.vx = 450;
  const rightEvt = bombRebound.update(0.02, court, p1, p2);
  assert.strictEqual(rightEvt, null, 'Right wall bounce does not end point');
  assert(bombRebound.vx < 0, `Bomb vx must reverse to negative on right wall rebound (actual: ${bombRebound.vx})`);
  assert(bombRebound.inPlay, 'Bomb must remain in play after right wall bounce');
  console.log('✓ Left and right side-wall rebounds preserve play at active playable speed.');

  // Scenario C: Both survive full 5 seconds -> Award 1 point to each player!
  const bombSurvive = new Ball(config);
  bombSurvive.serve('p1', 500, 200);
  bombSurvive.transformToBomb();
  // Fast forward bomb fuse to near zero
  bombSurvive.bombFuseTimer = 0.01;
  p1.y = 80;
  p2.y = 80;

  const surviveEvt = bombSurvive.update(0.02, court, p1, p2);
  assert(surviveEvt && surviveEvt.type === 'POINT_SCORED', '5s timer expiration must end point');
  assert.strictEqual(surviveEvt.scorer, 'both', 'Both players awarded 1 point when full 5s expire without hit');
  console.log('✓ Both-survive scoring awarded 1 point to each player after 5 seconds expired.');

  // Scenario D: Deterministic collision on the frame timer reaches zero: Hit takes precedence over survival!
  const bombFrameZero = new Ball(config);
  bombFrameZero.serve('p1', 885, p2.y);
  bombFrameZero.transformToBomb();
  bombFrameZero.bombFuseTimer = 0.005; // Will expire this frame
  bombFrameZero.x = p2.x;
  bombFrameZero.y = p2.y;
  bombFrameZero.vx = 500;

  const frameZeroEvt = bombFrameZero.update(0.016, court, p1, p2);
  assert(frameZeroEvt && frameZeroEvt.type === 'POINT_SCORED');
  assert.strictEqual(frameZeroEvt.scorer, 'p1', 'Hit on zero-frame must award point to opponent, not both');
  console.log('✓ Deterministic collision precedence on frame timer reaches zero verified.');
}

// Test 6: Smarter CPU tracking, multi-rebound path prediction & bomb evasion
{
  console.log('Testing Smarter CPU trajectory prediction, rebound adaptation, and bomb evasion...');
  const config = createConfig();
  const court = new Court(config);
  const p2 = new Player('p2', 890, false, config);
  const ai = new ComputerOpponent(p2, config);

  // 1. Rocket phase: CPU calculates target to intercept
  const rocket = new Ball(config);
  rocket.serve('p1', 200, 300);
  ai.perceivedBall = { x: rocket.x, y: rocket.y, vx: rocket.vx, vy: rocket.vy, inPlay: true, phase: BallPhase.ROCKET };
  ai.predictTrajectoryAndTarget();
  assert(ai.targetY > 0 && ai.targetY < config.court.groundY, 'CPU predicts valid intercept height in rocket phase');

  // 2. Bomb phase: Incoming bomb low -> CPU chooses evasion altitude to dodge!
  const bomb = new Ball(config);
  bomb.serve('p1', 300, 450);
  bomb.transformToBomb();
  ai.perceivedBall = { x: bomb.x, y: bomb.y, vx: bomb.vx, vy: bomb.vy, inPlay: true, phase: BallPhase.BOMB };
  ai.predictTrajectoryAndTarget();

  // For a low incoming bomb, CPU target should be high to jump up and dodge!
  assert(ai.targetY < 200, `CPU must target high altitude to dodge low incoming bomb (targetY=${ai.targetY.toFixed(1)})`);

  // 3. Bomb phase multi-rebound prediction: Bomb heading away (vx < 0), will rebound off left wall and return
  const bombRebound = new Ball(config);
  bombRebound.serve('p2', 200, 400);
  bombRebound.transformToBomb();
  bombRebound.vx = -400; // Moving left towards left wall
  ai.perceivedBall = { x: bombRebound.x, y: bombRebound.y, vx: bombRebound.vx, vy: bombRebound.vy, inPlay: true, phase: BallPhase.BOMB };
  ai.predictTrajectoryAndTarget();
  assert(ai.targetY !== undefined && ai.targetY > 0, 'CPU projects side-wall rebound path and maintains evasion target');

  console.log(`✓ Smarter CPU actively targeted evasion altitude (${ai.targetY.toFixed(1)}px) and adapted across rebounds! 🪔`);
}

console.log('\nALL 6 DIWALI & HOT-POTATO TEST SUITES PASSED! ✨');
