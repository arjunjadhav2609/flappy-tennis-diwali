/**
 * Match Flow & State Machine Test
 * Verifies the full match lifecycle from serve to rally exchanges,
 * 20-second countdown transformation from Rocket to Sudden-Death Bomb,
 * hot-potato point awards, next serve alternation, and match victory.
 */

import assert from 'assert';
import { createConfig } from '../src/config.js';
import { Court } from '../src/court.js';
import { Player } from '../src/player.js';
import { Ball, BallPhase } from '../src/ball.js';
import { ComputerOpponent } from '../src/ai.js';
import { GameState, GameMode } from '../src/game.js';

console.log('--- Testing Match Flow & State Lifecycle (Diwali Edition) ---');

class HeadlessGame {
  constructor() {
    this.config = createConfig();
    this.court = new Court(this.config);
    this.p1 = new Player('p1', this.config.court.baselineP1X, true, this.config);
    this.p2 = new Player('p2', this.config.court.baselineP2X, false, this.config);
    this.ball = new Ball(this.config);
    this.ai = new ComputerOpponent(this.p2, this.config);

    this.mode = GameMode.PVC;
    this.state = GameState.MENU;
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.currentServer = 'p1';
    this.stateTimer = 0;
    this.pointCountdown = this.config.hotPotato.countdownSeconds;
  }

  startMatch() {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    this.currentServer = 'p1';
    this.prepareServe();
  }

  prepareServe() {
    this.state = GameState.SERVING;
    this.stateTimer = this.config.gameplay.serveCountdownMs / 1000;
    this.pointCountdown = this.config.hotPotato.countdownSeconds;
  }

  executeServe() {
    this.state = GameState.RALLY;
    const startX = this.currentServer === 'p1' ? this.p1.getRacketX() + 12 : this.p2.getRacketX() - 12;
    const startY = this.currentServer === 'p1' ? this.p1.y : this.p2.y;
    this.ball.serve(this.currentServer, startX, startY);
  }

  onRallyEnd(reason, scorer) {
    this.state = GameState.POINT_SCORED;
    this.stateTimer = this.config.gameplay.pointCelebrationMs / 1000;
    this.ball.inPlay = false;

    if (scorer === 'p1') {
      this.scoreP1++;
    } else {
      this.scoreP2++;
    }
    this.currentServer = this.currentServer === 'p1' ? 'p2' : 'p1';
  }

  onMatchOver() {
    this.state = GameState.GAME_OVER;
  }

  step(dt) {
    this.court.update(dt);
    this.p1.update(dt);
    this.p2.update(dt);
    if (this.mode === GameMode.PVC) {
      this.ai.update(dt, this.ball, this.court);
    }

    if (this.state === GameState.SERVING) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.executeServe();
      }
    } else if (this.state === GameState.RALLY) {
      this.pointCountdown -= dt;
      if (this.pointCountdown <= 0) {
        this.pointCountdown = 0;
        if (this.ball.phase !== BallPhase.BOMB) {
          this.ball.transformToBomb();
        }
      }

      const rallyEvent = this.ball.update(dt, this.court, this.p1, this.p2);
      if (rallyEvent && rallyEvent.type === 'POINT_SCORED') {
        this.onRallyEnd(rallyEvent.reason, rallyEvent.scorer);
      }
    } else if (this.state === GameState.POINT_SCORED) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.scoreP1 >= this.config.gameplay.pointsToWin || this.scoreP2 >= this.config.gameplay.pointsToWin) {
          this.onMatchOver();
        } else {
          this.prepareServe();
        }
      }
    }
  }
}

// 1. Initial State
const game = new HeadlessGame();
assert.strictEqual(game.state, GameState.MENU);

// 2. Start Match
game.startMatch();
assert.strictEqual(game.state, GameState.SERVING);
assert.strictEqual(game.currentServer, 'p1');

// Countdown to serve
while (game.state === GameState.SERVING) {
  game.step(0.02);
}
assert.strictEqual(game.state, GameState.RALLY, 'Serve should execute and enter RALLY state');
assert.strictEqual(game.ball.phase, BallPhase.ROCKET, 'Ball must start in ROCKET phase');

// 3. Test Rocket Rally exchanges (allow sufficient time for 15-20% reduced travel speed)
let rallyReturns = 0;
for (let step = 0; step < 160; step++) {
  const prevHitter = game.ball.lastHitter;
  game.step(0.02);
  if (game.ball.lastHitter !== prevHitter && game.ball.lastHitter === 'p2') {
    rallyReturns++;
  }
}
assert(rallyReturns >= 1, 'Smarter CPU must return the rocket ball');
console.log(`✓ CPU returned serve during rally (Rally active, Ball X=${game.ball.x.toFixed(1)}).`);

// 4. Test 10-second countdown transformation into Sudden-Death Bomb
console.log('Testing 10-second countdown transformation into Sudden-Death Bomb...');
// Fast-forward pointCountdown to 0.1s
game.pointCountdown = 0.05;
game.step(0.06);

assert.strictEqual(game.ball.phase, BallPhase.BOMB, 'Ball must transform into BOMB when 10s countdown reaches 0s');
console.log('✓ Rocket successfully transformed into Sudden-Death Bomb when countdown expired!');

// 5. Test Hot-Potato Bomb resolution: P1 moves in front of bomb and touches it -> P2 wins point!
game.p1.y = game.ball.y;
game.ball.x = game.p1.getRacketBounds().overall.left;
game.ball.vx = -400;

for (let step = 0; step < 10; step++) {
  game.step(0.02);
  if (game.state === GameState.POINT_SCORED) break;
}

assert.strictEqual(game.state, GameState.POINT_SCORED, 'Touching bomb ends rally immediately');
assert.strictEqual(game.scoreP2, 1, 'Point awarded to Player 2 when bomb touches Player 1');
console.log(`✓ Hot-Potato sudden death point awarded to P2. Score: P1=${game.scoreP1}, P2=${game.scoreP2}.`);

// 6. Complete match to victory (First to 5 points)
while (game.state !== GameState.GAME_OVER) {
  if (game.state === GameState.RALLY) {
    game.p1.y = 80; // Keep P1 away so P2 scores
  }
  game.step(0.02);
}

assert.strictEqual(game.state, GameState.GAME_OVER, 'Match completes when target score reached');
assert(game.scoreP2 >= 5, 'P2 reaches 5 points');
console.log(`✓ Full match completed at score ${game.scoreP1} - ${game.scoreP2} with Diwali victory! 🏆`);

console.log('\nMATCH FLOW TEST PASSED CLEANLY! 🏆');
