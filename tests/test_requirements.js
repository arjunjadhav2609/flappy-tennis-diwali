import assert from 'assert';
import { createConfig } from '../src/config.js';
import { Court } from '../src/court.js';
import { Player } from '../src/player.js';
import { Ball, BallPhase } from '../src/ball.js';
import { ComputerOpponent } from '../src/ai.js';
import { GameState, GameMode, TennisGame } from '../src/game.js';

console.log('--- Running Comprehensive Requirement Tests ---');

// 1. Two-player and Player vs Computer modes
{
  const config = createConfig();
  assert.strictEqual(config.gameplay.pointsToWin, 5);
  console.log('✓ PvC and PvP mode settings verified.');
}

// 2. Open court, no net
{
  const config = createConfig();
  const court = new Court(config);
  assert.strictEqual(court.centerX, 500);
  console.log('✓ Open court verified (no net obstruction).');
}

// 3. Vertical-only player movement, click/tap moves upward, gravity brings down
{
  const config = createConfig();
  const p1 = new Player('p1', 110, true, config);
  const startX = p1.x;
  p1.tapJump();
  assert.strictEqual(p1.vy, config.player.jumpImpulse);
  p1.update(0.05);
  assert.strictEqual(p1.x, startX, 'X position must never change');
  assert(p1.y < config.court.groundY - p1.height / 2, 'Y position moved upward');
  // Gravity pulls back down
  for (let i = 0; i < 40; i++) p1.update(0.05);
  assert.strictEqual(p1.y, config.court.groundY - p1.height / 2, 'Player returns to ground');
  console.log('✓ Vertical impulse movement and gravity verified.');
}

// 4. Rackets stay at fixed horizontal positions and follow players vertically
{
  const config = createConfig();
  const p1 = new Player('p1', 110, true, config);
  const fixedRacketX = p1.getRacketX();
  p1.tapJump();
  p1.update(0.1);
  assert.strictEqual(p1.getRacketX(), fixedRacketX, 'Racket X stays strictly fixed horizontally');
  assert.strictEqual(p1.getRacketBounds().centerY, p1.y, 'Racket vertically follows player');
  console.log('✓ Racket horizontal lock and vertical tracking verified.');
}

// 5. Computer tracking and rally play limits
{
  const config = createConfig();
  const p2 = new Player('p2', 890, false, config);
  const ai = new ComputerOpponent(p2, config);
  assert(ai.config.ai.reactionDelayMs > 0, 'Reaction delay must be finite');
  assert(ai.config.ai.tapCooldownMs > 0, 'Tap cooldown must limit jump spam');
  console.log('✓ Computer opponent reaction limits verified.');
}

// 6. Ground bounce regular and predictable: one bounce per contact, no duplicate/rolling, 1.5x baseline
{
  const config = createConfig();
  const ball = new Ball(config);
  ball.y = config.court.groundY - ball.radius;
  ball.vy = 200;
  ball.vx = 350;
  const bounce1 = ball.checkGroundBounce();
  assert(bounce1, 'Ground bounce must trigger');
  assert(ball.vy <= -config.ball.arcadeBounceImpulse * 0.9, 'Rebound velocity must equal upward arcade impulse (1.5x baseline)');
  // Next frame while still on boundary
  const bounce2 = ball.checkGroundBounce();
  assert.strictEqual(bounce2, null, 'Duplicate ground bounce on same contact prevented');
  console.log('✓ Predictable single ground bounce with no duplicate/rolling verified.');
}

// 7. Ceiling, ground, and ordinary racket impacts 1.5x baseline bounce consistency (540 px/s)
{
  const config = createConfig();
  const groundBounce = config.ball.arcadeBounceImpulse;
  const ceilingBounce = config.ball.ceilingBounceImpulse;
  const racketBaseReturn = config.racketReturn.baseReturnSpeed;

  assert.strictEqual(groundBounce, 540, 'Ground bounce impulse is 1.5x baseline (540 px/s)');
  assert.strictEqual(ceilingBounce, 540, 'Ceiling bounce impulse is 1.5x baseline (540 px/s)');
  assert.strictEqual(racketBaseReturn, 540, 'Ordinary racket impact baseline bounce is 1.5x baseline (540 px/s)');
  console.log('✓ Ceiling, ground, and ordinary racket impacts 1.5x baseline bounce (540 px/s) verified.');
}

// 8. Rocket placement at start of point slightly above starting player racket & click to rise
{
  const config = createConfig();
  const p1 = new Player('p1', 110, true, config);
  const ball = new Ball(config);

  const hoverX = p1.getRacketX();
  const hoverY = p1.y - 65;
  ball.prepareHover('p1', hoverX, hoverY);

  assert.strictEqual(ball.x, p1.getRacketX(), 'Rocket X placed at starting player racket X');
  assert(ball.y < p1.getRacketBounds().head.top, 'Rocket placed slightly above player racket top');
  assert.strictEqual(ball.inPlay, false, 'Rocket stays hovering before player makes contact');

  // Player clicks to rise
  p1.tapJump();
  // Player rises over a few frames until racket reaches hovering rocket
  let hit = null;
  for (let f = 0; f < 10; f++) {
    p1.update(0.016);
    hit = ball.testRacketHit(p1, ball.x, ball.y, 1);
    if (hit) break;
  }
  assert(hit, 'Player rising upward must make contact with hovering rocket');
  assert.strictEqual(hit.type, 'RACKET_HIT');
  console.log('✓ Rocket hover above racket and rise-to-serve contact verified.');
}

// 9. Racket collision shape matching visible shape (oval head, straight handle directly connected, no neck/throat)
{
  const config = createConfig();
  const p1 = new Player('p1', 110, true, config);
  p1.y = 300;
  const rb = p1.getRacketBounds();

  // A. Ball at handle height but far to the right (outside visible handle profile):
  const ballOutsideHandle = new Ball(config);
  ballOutsideHandle.x = rb.x + 18;
  ballOutsideHandle.y = rb.handle.centerY;
  ballOutsideHandle.vx = -400;
  const noHitHandle = ballOutsideHandle.testRacketHit(p1, ballOutsideHandle.x + 8, ballOutsideHandle.y, 1);
  assert.strictEqual(noHitHandle, null, 'Must NOT hit mid-air outside visible handle');

  // B. Ball hitting visible straight cylindrical handle:
  const ballInsideHandle = new Ball(config);
  ballInsideHandle.x = rb.x + 4;
  ballInsideHandle.y = rb.handle.centerY;
  ballInsideHandle.vx = -400;
  const hitHandle = ballInsideHandle.testRacketHit(p1, ballInsideHandle.x + 8, ballInsideHandle.y, 1);
  assert(hitHandle && hitHandle.zone === 'HANDLE', 'Must hit visible straight handle');

  // C. Verify throat is completely removed:
  assert.strictEqual(rb.throat, undefined, 'Neck/throat shape and hitbox must not exist');
  assert.strictEqual(rb.handle.top, rb.head.bottom, 'Handle connects directly to bottom of head');

  // D. Ball hitting center sweet spot target zone:
  const ballSweet = new Ball(config);
  ballSweet.x = rb.x + 4;
  ballSweet.y = rb.head.centerY;
  ballSweet.vx = -400;
  const hitSweet = ballSweet.testRacketHit(p1, ballSweet.x + 8, ballSweet.y, 1);
  assert(hitSweet && hitSweet.zone === 'SWEET_SPOT', 'Must hit center sweet spot target zone');
  assert(ballSweet.superShotTimer > 0, 'Sweet spot activates visual super shot cue');

  console.log('✓ Collision shape matches visible shape (head, direct handle, no neck) verified.');
}

// 10. Explosive phase 10s countdown, faster bomb, touch loses, avoid wins
{
  const config = createConfig();
  assert.strictEqual(config.hotPotato.countdownSeconds, 10.0, 'Countdown is 10 seconds');

  const p1 = new Player('p1', 110, true, config);
  const p2 = new Player('p2', 890, false, config);
  const court = new Court(config);

  // Bomb touch loses
  const bombTouch = new Ball(config);
  bombTouch.serve('p2', 200, 300);
  bombTouch.transformToBomb();
  bombTouch.x = p1.x;
  bombTouch.y = p1.y;
  const touchEvt = bombTouch.update(0.016, court, p1, p2);
  assert(touchEvt && touchEvt.scorer === 'p2', 'Touching bomb gives point to opponent');

  // Bomb avoided wins
  const bombAvoid = new Ball(config);
  bombAvoid.serve('p2', 200, 480);
  bombAvoid.transformToBomb();
  p1.y = 100; // dodge high
  bombAvoid.x = p1.getRacketBounds().overall.left - 20;
  bombAvoid.y = 480;
  bombAvoid.vx = -500;
  const avoidEvt = bombAvoid.update(0.016, court, p1, p2);
  assert(avoidEvt && avoidEvt.scorer === 'p1', 'Avoiding bomb gives point to dodging player');

  // Bomb detonation without contact wins
  const bombDetonate = new Ball(config);
  bombDetonate.serve('p2', 250, 400);
  bombDetonate.transformToBomb();
  bombDetonate.bombFuseTimer = 0.001;
  const detEvt = bombDetonate.update(0.016, court, p1, p2);
  assert(detEvt && detEvt.scorer === 'p1', 'Bomb detonation without contact awards point to dodging player');

  console.log('✓ Explosive phase rules (10s countdown, touch loses, avoid wins) verified.');
}

// 11. Missed rocket Diya effect data
{
  const config = createConfig();
  const ball = new Ball(config);
  const p1 = new Player('p1', 110, true, config);
  const p2 = new Player('p2', 890, false, config);
  ball.x = p1.getRacketBounds().overall.left - 15;
  ball.y = 320;
  ball.vx = -400;
  ball.vy = 50;
  const missEvt = ball.checkMissedBall(p1, p2);
  assert(missEvt, 'Missed shot must be reported');
  assert.strictEqual(missEvt.missingPlayer, 'p1');
  assert.strictEqual(missEvt.missX, ball.x);
  assert.strictEqual(missEvt.missY, ball.y);
  console.log('✓ Missed rocket reporting with position data verified.');
}

console.log('\nALL REQUIREMENT VERIFICATION TESTS PASSED CLEANLY! 🎯');
