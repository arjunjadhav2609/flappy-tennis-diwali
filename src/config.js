/**
 * Game Configuration & Physics Parameters
 * Diwali Open Court Edition with Arcade Bouncing, Multi-Zone Rackets,
 * and Rocket-to-Bomb Hot-Potato Sudden Death Mechanics.
 */

export const DEFAULT_CONFIG = {
  court: {
    width: 1000,
    height: 600,
    groundY: 520,         // Vertical coordinate of court ground line
    baselineP1X: 110,     // Player 1 fixed baseline X
    baselineP2X: 890,     // Player 2 fixed baseline X
    ceilingY: 30,         // Top playable court boundary
    minX: 10,             // Left playable court boundary
    maxX: 990,            // Right playable court boundary (width - 10)
  },

  player: {
    width: 38,
    height: 64,
    gravity: 950,         // Downward acceleration in px/sec^2
    jumpImpulse: -420,    // Upward instantaneous velocity per tap/click (px/sec)
    terminalVelocity: 600,// Max downward falling speed
    racketOffset: 30,     // Distance of racket in front of player
  },

  // Racket shape: Oval frame with enlarged sweet spot target zone and direct straight cylindrical handle
  racket: {
    totalHeight: 80,
    headWidth: 26,
    headHeight: 52,       // Oval frame with strings & sweet-spot target zone
    sweetSpotWidth: 16,   // Width of center target zone
    sweetSpotHeight: 18,  // Practical sweet-spot focus area (±9px from center)
    sweetSpotSpeedMultiplier: 1.4, // Super shot speed boost on sweet spot hit
    handleHeight: 28,     // Straight cylindrical side-view handle connected directly to frame
    handleWidth: 8,       // Cylindrical grip diameter
  },

  ball: {
    radius: 9,
    gravity: 580,         // Crisp arcade gravity (px/sec^2)
    arcadeBounceImpulse: 540, // 1.5x original baseline bounce (360 * 1.5 = 540 px/s)
    ceilingBounceImpulse: 540,// 1.5x original baseline ceiling rebound (540 px/s)
    groundFriction: 0.98,    // Low horizontal friction to keep arcade pace lively
    travelSpeedRatio: 0.82,  // Rocket normal travel speed set to 82% (18% reduction)
    serveSpeedX: 360,     // Horizontal serve launch speed (81.8% of previous 440)
    serveSpeedY: -160,    // Initial vertical serve arc
    minHorizontalSpeed: 300, // Minimum speed so ball never stalls (83.3% of previous 360)
    maxSpeed: 960,        // Playable and stable max velocity ceiling
    speedMultiplier: 1.03, // Slight rally speed increase per racket return
  },

  racketReturn: {
    // Oval Head (Strings & Frame)
    centerAngleDeg: -10,  // Center hit angle: slight upward arc across the court
    angleSpreadDeg: 26,   // Top hits angle up to (-10 - 26) = -36°, lower head up to (-10 + 26) = +16°
    baseReturnSpeed: 540, // 1.5x original baseline bounce (360 * 1.5 = 540 px/s)
  },

  // Rocket and Hot-Potato Bomb Mechanics
  hotPotato: {
    countdownSeconds: 10.0, // 10-second Rocket rally countdown (unchanged)
    warningThresholdSec: 3.5, // Warning threshold when rocket time is running out
    bombSpeedMultiplier: 1.82, // Challenging sudden-death speed boost (up from 1.68)
    bombFuseDurationSec: 10.0, // Full 10-second Bomb countdown
    runWarningDurationSec: 1.4,// Duration to display prominent RUN! dodge warning
    bombBounceMultiplier: 1.32, // Stronger Bomb ground bounce (1.32x = 712.8 px/s)
    bombCeilingMultiplier: 1.28, // Stronger Bomb ceiling rebound (1.28x = 691.2 px/s)
    bombMinHorizontalSpeed: 420, // Elevated minimum speed for brisk, challenging motion
    bombSideReboundMultiplier: 1.12, // Dynamic side wall rebound impulse multiplier
  },

  ai: {
    reactionDelayMs: 120,     // Simulates human visual reaction latency in Rocket phase (ms)
    bombReactionDelayMs: 80,  // Sharpened crisis reflex during fast Bomb phase (ms)
    tapCooldownMs: 180,       // Minimum time between consecutive jumps in Rocket phase (ms)
    bombTapCooldownMs: 150,   // Agile tap cadence for sustained bomb evasion (ms)
    alignmentTolerance: 20,   // Acceptable vertical distance between racket and ball
    readyHeightY: 340,        // Ready stance hover height while ball is on opponent's side
    mistakeChance: 0.05,      // Small chance to slightly mistime jumps under pressure
    dodgeBombAggression: 0.90,// Tendency to actively avoid incoming sudden-death bomb
  },

  gameplay: {
    pointsToWin: 5,
    serveCountdownMs: 900,
    pointCelebrationMs: 1400,
  },

  diwali: {
    enableFireworks: true,
    enableDiyas: true,
    enableRangoli: true,
  }
};

// Deep clone helper so current config can be safely modified without altering defaults
export function createConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export const CONFIG = createConfig();
