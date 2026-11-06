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

// Test 5: Hot-Potato Bomb Sudden-Death Mechanics (10s Countdown)
{
  console.log('Testing Hot-Potato Bomb Sudden Death (10s countdown, Touching loses, Avoiding wins)...');
  const config = createConfig();
  assert.strictEqual(config.hotPotato.countdownSeconds, 10.0, 'Hot potato countdown must be 10.0 seconds');
  const court = new Court(config);
  const p1 = new Player('p1', 110, true, config);
  const p2 = new Player('p2', 890, false, config);

  // Scenario A: Bomb touches Player 1 -> Player 1 loses, Player 2 awarded point!
  const bombTouch = new Ball(config);
  bombTouch.serve('p2', 500, 300);
  bombTouch.transformToBomb();
  assert.strictEqual(bombTouch.phase, BallPhase.BOMB, 'Ball must be in BOMB phase');

  // Send bomb directly into P1
  bombTouch.x = p1.x + 2;
  bombTouch.y = p1.y;
  bombTouch.vx = -500;
  const touchEvt = bombTouch.update(0.016, court, p1, p2);

  assert(touchEvt && touchEvt.type === 'POINT_SCORED', 'Touching bomb must score point immediately');
  assert.strictEqual(touchEvt.scorer, 'p2', 'Player 2 awarded point when bomb touches Player 1');
  console.log('✓ Touching bomb caused player to lose point (hot potato penalty).');

  // Scenario B: Player 1 avoids bomb (bomb passes behind P1 without touching) -> Player 1 awarded point!
  const bombAvoid = new Ball(config);
  bombAvoid.serve('p2', 300, 480);
  bombAvoid.transformToBomb();
  // Move P1 up to ceiling to safely avoid the low bomb
  p1.y = 80;
  // Bomb is low near ground
  bombAvoid.x = p1.getRacketBounds().overall.left - 15;
  bombAvoid.y = 480;
  bombAvoid.vx = -500;

  const avoidEvt = bombAvoid.update(0.016, court, p1, p2);
  assert(avoidEvt && avoidEvt.type === 'POINT_SCORED', 'Avoiding bomb must score point');
  assert.strictEqual(avoidEvt.scorer, 'p1', 'Player 1 awarded point for successfully avoiding the bomb');
  console.log('✓ Successfully avoiding the bomb awarded point to the dodging player.');
}

// Test 6: Smarter CPU tracking & bomb evasion
{
  console.log('Testing Smarter CPU trajectory prediction, bounded variation, and bomb evasion...');
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
  console.log(`✓ Smarter CPU actively targeted evasion altitude (${ai.targetY.toFixed(1)}px) to dodge incoming sudden-death bomb! 🪔`);
}

console.log('\nALL 6 DIWALI & HOT-POTATO TEST SUITES PASSED! ✨');
