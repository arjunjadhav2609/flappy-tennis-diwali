# Flappy Diwali Tennis (Arcade & Hot-Potato Edition)

A simple, playable, two-player game inspired by tennis featuring vertical impulse movement on an open court, arcade-style bouncing, multi-zone tennis rackets, a 10-second Rocket-to-Bomb hot potato mechanic, and a vibrant Diwali festive theme.

---

## 🪔 Diwali Festive Visual Style

- **Atmosphere & Sky:** Deep royal twilight sky with ambient procedural fireworks blossoming across the upper background.
- **Hanging Toran & Lights:** Marigold flower garlands and glowing golden fairy-light swags along the upper court border.
- **Glowing Diyas:** Traditional terracotta diya oil lamps with flickering golden flames and soft radial illumination along the court baselines.
- **Court Surface & Rangoli:** Amethyst clay court with golden boundary markings and a central circular golden Rangoli lotus mandala.
- **Player Attire:** Traditional royal festive kurtas (Sapphire for P1, Ruby for P2) with shimmering golden trims, angavastram stoles, and festive turbans.
- **Clarity & Contrast:** Decorative elements are rendered subtly in the background to ensure the ball, rackets, countdown, and player positions remain instantly readable.

---

## 🎾 Ball & Arcade Ground Bouncing

- **Arcade Rebound:** Replaces diminishing bounces with **lively arcade-style bouncing**. Ground impacts apply a strong upward impulse (`arcadeBounceImpulse: 530 px/s`), ensuring the ball always pops back up into comfortable hitting height instead of rolling along the ground.
- **Lively & Energetic:** Increased bounce strength from both the court ground and rackets keeps play fast-paced and exciting while remaining completely predictable.

---

## 🏸 Racket Shape & Impact Physics

The racket features a recognizable tennis racket shape with 3 distinct collision zones:

1. **Oval Head (Strings & Frame):**
   - Visible oval frame with cross-woven string bed.
   - Hits produce a strong, lively return bounce across the court.
   - Return angle depends on hit position: top of head produces a higher upward arc / lob (`-36°`), while the center produces a flat drive (`-10°`).
2. **Curved Throat:**
   - Wishbone twin struts connecting the oval head to the handle.
   - **Hits on the curved throat send the ball at a sharper downward angle (`+36°`), with greater downward speed (1.25x boost) and extra ground bounce!**
3. **Handle / Grip:**
   - Wrapped grip tape extending to the player's hands.

---

## 🚀 Hot-Potato Point Mechanic (Rocket to Bomb Phase)

- **10-Second Rocket Phase (0 - 10s):**
  - Projectile flies as a festive Diwali firework rocket with trailing spark exhaust.
  - Players rally back and forth using normal racket mechanics.
  - HUD displays a distinct Rocket countdown (`🚀 ROCKET: 10.0s`).
- **Prominent “RUN!” Warning:**
  - When the 10-second countdown ends, a prominent **“RUN!”** warning banner appears in red highlights alerting both players to dodge.
  - Positioned clearly in the open court without obscuring the HUD timer or player positions.
- **5-Second Sudden-Death Bomb Phase (5s fresh countdown):**
  - Rocket transforms into an explosive **Diwali Bomb** with speed boost and starts a fresh, visible 5-second countdown in the HUD (`💣 BOMB: 5.0s`).
  - **Dynamic 4-Wall Rebounds:** The bomb bounces off the court’s left and right sides (`minX = 10`, `maxX = 990`) as well as the ceiling (`ceilingY = 30`) and ground boundaries (`groundY = 520`) with slightly boosted bounce strength (`1.13x` impulse: ~590–640 px/s) and controlled, bounded variation so it doesn't repeat predictable paths. Movement remains fair, readable, strictly speed-capped (`<= 960 px/s`), and within playable court bounds.
  - **Preserved Rocket Phase Physics:** Normal rocket rallies strictly preserve baseline travel speed (82% ratio), consistent 540 px/s arcade ground/ceiling bounces, and standard racket returns.
  - **Hit-by-Bomb Penalty:** If the bomb touches one player or their racket during the 5 seconds, the point ends immediately and awards 1 point to the opponent.
  - **Both-Survive Scoring:** If the full 5 seconds expire without either player being hit, 1 point is awarded to each player.
  - **Deterministic Collision Resolution:** Collisions occurring on the exact frame the timer reaches zero take precedence over timer expiry, preventing duplicate scoring.
  - **Point Reset & Match Flow:** Rocket timer (10s) and Bomb timer (5s) reset cleanly for every new point, preserving the first-to-five match flow, server alternation, score display, and both PvC and PvP game modes.

---

## 🤖 Smarter & Responsive CPU Opponent

- **Rocket Phase:** Capable and responsive rally intercept timing, calculating jump apex windows (0.16s–0.45s) to consistently return shots, adopting an alert ready-hover stance (`readyHeightY: 340`) while the ball is on the opponent's side, and tactically alternating between sweet-spot drives, upper lobs, and low drives.
- **5-Second Bomb Phase & Continuous Evasion:**
  - Simulates multi-bounce paths incorporating dynamic side-wall rebounds, ceiling rebounds, and ground bounces across actual court bounds up to 3.5s forward.
  - Adapts to varied bounce deflections in real time and maintains active evasive dodging throughout the full 5-second phase.
  - High-altitude jumping clears both body and racket on low arrivals, while grounded positioning lets high passes fly safely overhead.
  - Emergency proximity avoidance reacts immediately to sudden ricochets.
  - Remains fallible and fun to play against through human reaction latency (120ms), tap cooldowns, and a fair error margin (5%).

---

## 🎨 Polished UI & Expressive Characters

- **Opening Screen:**
  - Prominent Match Objective banner ("First to 5 Points Wins the Festival Crown!").
  - Clear Solo vs 2P mode selector with active indicators and `[SOLO]` / `[2-PLAYER]` badges.
  - Two-phase gameplay walkthrough (Phase 1: 10s Rocket Rally vs Phase 2: 5s Bomb Dodge).
  - Explicit split controls layout for Player 1 (Sapphire Prince) and Player 2 / CPU (Ruby Champion), plus mobile touch guidance.
- **Expressive Characters & Distinct Silhouettes:**
  - **Visual Distinction & Silhouettes:** P1 features an upright royal Kalgi feather plume with azure jewel and sapphire kurta; P2/CPU features a wide regal turban with an emerald peacock aigrette brooch and ruby crimson attire. Silhouettes are unmistakable at any distance.
  - **Dynamic Facial Expressions:** Eyes and brows dynamically react to gameplay states:
    - *Bomb Phase:* Alarmed wide eyes, high arched brows, and a stylized tension sweat bead!
    - *Sweet Spot:* Radiant golden starburst eyes with an expanding impact shockwave ring!
    - *Hit Impact:* Spirited tennis wink with athletic effort smile.
    - *Rising Jump:* Upward-tracking focused gaze.
  - **Movement & Impact Animations:** Athletic squash & stretch launch, smooth forward racket swing with follow-through recoil, and soft landing compression.

---

## 🕹️ Controls

| Action | Player 1 (Sapphire) | Player 2 / CPU (Ruby) |
|---|---|---|
| **Vertical Jump Impulse** | <kbd>W</kbd> or <kbd>Space</kbd> | <kbd>▲ Up Arrow</kbd> or <kbd>Enter</kbd> |
| **Touch / Mouse** | Click / Tap Left side or `[ P1 JUMP ]` | Click / Tap Right side or `[ P2 JUMP ]` |
| **Solo Mode (PvC)** | Any screen click, tap, or <kbd>Space</kbd> | Managed by Smarter CPU |

---

## 🧪 Automated Test Suite

```powershell
npm test
```
Runs all 4 test suites:
- `test_simulation.js`: Validates arcade ground bounce impulse, multi-zone racket physics (oval head vs handle), 10s rocket-to-bomb sudden death rules, and CPU bomb evasion.
- `test_match_flow.js`: Validates full match lifecycle, countdown timers, sudden death scoring, and victory condition.
- `test_requirements.js`: Validates court dimensions, bounce consistency (540 px/s across racket, ground, and ceiling), vertical-only player movements, and collision rules.
- `test_speed_and_physics.js`: Validates 15-20% rocket travel speed reduction, bounce consistency, and explosive phase faster speed.

---

## 🚀 How to Run

1. **Using HTTP Server:**
   ```powershell
   npm start
   ```
   Open `http://localhost:3000` in any browser.
2. **Direct File / Offline:**
   Open `index.html` directly in any browser.
