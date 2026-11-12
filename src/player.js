/**
 * Player Entity (White-Canvas Presentation)
 * Controls vertical movement, gravity, impulse taps, boundary clamps,
 * high-contrast festive Diwali attire, and the multi-zone tennis racket
 * (oval head with strings, enlarged sweet spot target zone, and straight cylindrical handle).
 */

import { sound } from './audio.js';

export class Player {
  /**
   * @param {string} id - 'p1' or 'p2'
   * @param {number} x - Fixed horizontal position
   * @param {boolean} isFacingRight - True for P1, False for P2
   * @param {object} config - Game configuration
   */
  constructor(id, x, isFacingRight, config) {
    this.id = id;
    this.x = x;
    this.isFacingRight = isFacingRight;
    this.config = config;

    // Movement state
    this.width = config.player.width;
    this.height = config.player.height;

    // Start player on the ground
    this.y = config.court.groundY - this.height / 2;
    this.vy = 0;

    // Racket horizontal offset
    this.racketOffsetX = isFacingRight ? config.player.racketOffset : -config.player.racketOffset;

    // Hit & impulse animations
    this.hitEffectTimer = 0;
    this.hitZoneType = null; // 'HEAD' | 'SWEET_SPOT' | 'HANDLE'
    this.jumpSquashTimer = 0;

    // High-contrast festive colors (stand out boldly on white canvas)
    this.kurtaColor = isFacingRight ? '#1d4ed8' : '#be123c'; // Royal Sapphire vs Ruby Crimson
    this.kurtaTrim = '#f59e0b'; // Shimmering Gold
    this.turbanColor = isFacingRight ? '#f97316' : '#e11d48';
    this.shoeColor = '#fbbf24';
  }

  updateConfig(config) {
    this.config = config;
    this.width = config.player.width;
    this.height = config.player.height;
    this.racketOffsetX = this.isFacingRight ? config.player.racketOffset : -config.player.racketOffset;
  }

  reset() {
    this.y = this.config.court.groundY - this.height / 2;
    this.vy = 0;
    this.hitEffectTimer = 0;
    this.hitZoneType = null;
    this.jumpSquashTimer = 0;
  }

  /**
   * Upward vertical impulse when tapping or clicking
   */
  tapJump() {
    this.vy = this.config.player.jumpImpulse;
    this.jumpSquashTimer = 0.14;
    sound.playJump();
  }

  onHitBall(zoneType = 'HEAD') {
    this.hitEffectTimer = 0.18;
    this.hitZoneType = zoneType;
  }

  update(dt) {
    const { gravity, terminalVelocity } = this.config.player;
    const { groundY, ceilingY } = this.config.court;

    // Apply downward gravity
    this.vy += gravity * dt;
    if (this.vy > terminalVelocity) {
      this.vy = terminalVelocity;
    }

    // Update vertical position (strictly vertical movement)
    this.y += this.vy * dt;

    // Keep players strictly within playable court area
    const minY = ceilingY + this.height / 2;
    const maxY = groundY - this.height / 2;

    if (this.y < minY) {
      this.y = minY;
      if (this.vy < 0) this.vy = 0;
    } else if (this.y > maxY) {
      this.y = maxY;
      if (this.vy > 0) this.vy = 0;
    }

    // Decay visual timers
    if (this.hitEffectTimer > 0) {
      this.hitEffectTimer -= dt;
    }
    if (this.jumpSquashTimer > 0) {
      this.jumpSquashTimer -= dt;
    }
  }

  getRacketX() {
    return this.x + this.racketOffsetX;
  }

  /**
   * Racket bounding geometry:
   * 1. Oval Head (Strings & Frame with enlarged sweet-spot target zone)
   * 2. Straight Cylindrical Handle (connected directly to bottom of frame, no V-shaped neck)
   */
  getRacketBounds() {
    const rx = this.getRacketX();
    const r = this.config.racket;
    const headH = r.headHeight; // 52
    const headW = r.headWidth;  // 26
    const handleH = r.handleHeight; // 28
    const handleW = r.handleWidth;  // 8

    // Head is centered slightly above player center
    const headCenterY = this.y - 14;
    const headBottom = headCenterY + headH / 2;
    const handleCenterY = headBottom + handleH / 2;

    return {
      x: rx,
      centerY: this.y,
      head: {
        centerX: rx,
        centerY: headCenterY,
        radiusX: headW / 2,
        radiusY: headH / 2,
        top: headCenterY - headH / 2,
        bottom: headBottom,
        left: rx - headW / 2,
        right: rx + headW / 2,
        width: headW,
        height: headH,
      },
      handle: {
        centerX: rx,
        centerY: handleCenterY,
        top: headBottom,
        bottom: headBottom + handleH,
        left: rx - handleW / 2,
        right: rx + handleW / 2,
        width: handleW,
        height: handleH,
      },
      overall: {
        left: rx - headW / 2,
        right: rx + headW / 2,
        top: headCenterY - headH / 2,
        bottom: headBottom + handleH,
        height: r.totalHeight,
      }
    };
  }

  /**
   * Provides the exact cross-sectional profile and collision geometry at height y
   * matching the visible racket geometry:
   * - Oval Head (Strings & Frame with practical center sweet-spot target zone)
   * - Straight Cylindrical Handle (directly connected to bottom of frame, no neck)
   */
  getRacketProfileAt(y) {
    const rx = this.getRacketX();
    const rb = this.getRacketBounds();

    // 1. Oval Head Zone (Frame & String Bed)
    if (y >= rb.head.top && y <= rb.head.bottom) {
      const dy = (y - rb.head.centerY) / rb.head.radiusY;
      const clampedDy = Math.min(Math.max(dy, -1), 1);
      // Oval half-width at height y (+ 2px frame edge)
      const halfW = rb.head.radiusX * Math.sqrt(Math.max(0, 1 - clampedDy * clampedDy)) + 2;
      const distFromCenter = Math.abs(y - rb.head.centerY);
      const sweetSpotHalf = (this.config.racket.sweetSpotHeight || 18) / 2;
      const isSweetSpot = distFromCenter <= sweetSpotHalf;

      return {
        left: rx - halfW,
        right: rx + halfW,
        width: halfW * 2,
        zone: isSweetSpot ? 'SWEET_SPOT' : 'HEAD',
        centerY: rb.head.centerY,
        radiusY: rb.head.radiusY,
      };
    }

    // 2. Straight Cylindrical Handle Zone (Directly connects to frame bottom, no neck)
    if (y > rb.handle.top && y <= rb.handle.bottom + 3) {
      const isButtCap = y >= rb.handle.bottom - 4;
      const halfW = isButtCap ? 5.5 : (this.config.racket.handleWidth / 2); // 4px shaft, 5.5px butt cap
      return {
        left: rx - halfW,
        right: rx + halfW,
        width: halfW * 2,
        zone: 'HANDLE',
      };
    }

    // Rounded top tip of oval head (within ball radius of top)
    if (y < rb.head.top && y >= rb.head.top - this.config.ball.radius) {
      const dist = rb.head.top - y;
      const halfW = Math.max(1, rb.head.radiusX * 0.45 - dist * 0.5);
      return {
        left: rx - halfW,
        right: rx + halfW,
        width: halfW * 2,
        zone: 'HEAD',
        centerY: rb.head.centerY,
        radiusY: rb.head.radiusY,
      };
    }

    return null;
  }

  draw(ctx, score = 0, displayName = null, isBombPhase = false) {
    const rx = this.getRacketX();
    const groundY = this.config.court.groundY;

    ctx.save();

    // 1. Soft Charcoal Ground Shadow on White Canvas
    const heightAboveGround = (groundY - (this.y + this.height / 2));
    const shadowScale = Math.max(0.3, 1 - heightAboveGround / 420);
    const shadowAlpha = Math.max(0.06, 0.22 * (1 - heightAboveGround / 450));

    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(this.x, groundY + 3, (this.width / 1.5) * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Tennis Racket (Oval Head + Direct Straight Cylindrical Handle)
    this.drawRacket(ctx, rx);

    // 3. Player Character in Festive Diwali Attire & Expressive Silhouette
    this.drawFestiveCharacter(ctx, isBombPhase);

    // 4. Polished overhead character HUD (Role, Score, Power-up Readiness)
    this.drawCharacterUI(ctx, score, displayName, isBombPhase);

    ctx.restore();
  }

  drawCharacterUI(ctx, score, displayName, isBombPhase = false) {
    const isP1 = this.id === 'p1';
    const roleText = displayName || (isP1 ? 'PLAYER 1' : 'CPU');
    const isSuperActive = this.hitEffectTimer > 0 && this.hitZoneType === 'SWEET_SPOT';

    // Position compact floating badge cleanly above player's head, clamped below ceiling
    const badgeX = this.x;
    const badgeY = Math.max(this.config.court.ceilingY + 28, this.y - this.height / 2 - 20);

    ctx.save();
    ctx.translate(badgeX, badgeY);

    const badgeW = 100;
    const badgeH = 24;

    // Clean white card base with soft paper drop shadow
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 12);
    ctx.fill();

    // Reset shadow for crisp borders & text
    ctx.shadowColor = 'transparent';

    // Crisp high-contrast outline with player accent color
    ctx.strokeStyle = isBombPhase ? '#dc2626' : (isSuperActive ? '#f59e0b' : (isP1 ? '#2563eb' : '#dc2626'));
    ctx.lineWidth = (isSuperActive || isBombPhase) ? 2.2 : 1.6;
    ctx.stroke();

    // Player Role / Name
    ctx.font = 'bold 9.5px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(roleText, -badgeW / 2 + 8, 0);

    // Score Pill (Crisp Jewel on White)
    const scoreColor = isP1 ? '#2563eb' : '#dc2626';
    ctx.fillStyle = isP1 ? 'rgba(37, 99, 235, 0.1)' : 'rgba(220, 38, 38, 0.1)';
    ctx.beginPath();
    ctx.roundRect(10, -badgeH / 2 + 3.5, 18, badgeH - 7, 5);
    ctx.fill();
    ctx.strokeStyle = scoreColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 10.5px "Cinzel", Georgia, serif';
    ctx.fillStyle = scoreColor;
    ctx.textAlign = 'center';
    ctx.fillText(score.toString(), 19, 0.5);

    // Power-Up / Phase Indicator (⚡READY / ⚡SUPER! / 💣DODGE!)
    ctx.textAlign = 'right';
    if (isBombPhase) {
      ctx.font = 'bold 8px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.fillText('💣DODGE', badgeW / 2 - 6, 0);
    } else if (isSuperActive) {
      ctx.font = 'bold 8.5px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = '#d97706';
      ctx.fillText('⚡SUPER', badgeW / 2 - 6, 0);
    } else {
      ctx.font = 'bold 8px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText('⚡READY', badgeW / 2 - 6, 0);
    }

    ctx.restore();
  }

  drawRacket(ctx, rx) {
    const rb = this.getRacketBounds();
    const isHitting = this.hitEffectTimer > 0;
    const isSweetSpotHit = isHitting && this.hitZoneType === 'SWEET_SPOT';
    const headHit = (isHitting && this.hitZoneType === 'HEAD') || isSweetSpotHit;

    ctx.save();

    // Dynamic Racket Swing & Follow-through impact animation
    if (isHitting) {
      const swingProgress = this.hitEffectTimer / 0.18;
      const swingAngle = Math.sin(swingProgress * Math.PI) * (this.isFacingRight ? 0.18 : -0.18);
      ctx.translate(rx, rb.handle.centerY);
      ctx.rotate(swingAngle);
      ctx.translate(-rx, -rb.handle.centerY);
    }

    // Arm connection to handle
    ctx.strokeStyle = '#0f172a'; // Arm outline
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const armX = this.x + (this.isFacingRight ? 10 : -10);
    const armY = this.y + 12;
    ctx.beginPath();
    ctx.moveTo(armX, armY);
    ctx.lineTo(rx, rb.handle.centerY);
    ctx.stroke();

    ctx.strokeStyle = '#fed7aa'; // Arm skin
    ctx.lineWidth = 4;
    ctx.stroke();

    // Sporty wristband
    const wristColor = this.isFacingRight ? '#2563eb' : '#dc2626';
    const wristX = armX * 0.35 + rx * 0.65;
    const wristY = armY * 0.35 + rb.handle.centerY * 0.65;
    ctx.strokeStyle = wristColor;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(wristX - 2, wristY - 2);
    ctx.lineTo(wristX + 2, wristY + 2);
    ctx.stroke();

    // 1. Straight Cylindrical Handle (connected directly to bottom of frame, no neck)
    const h = rb.handle;
    const hCX = rx;

    // Cylindrical side gradient
    const cylGrad = ctx.createLinearGradient(h.left, 0, h.right, 0);
    cylGrad.addColorStop(0, '#0f172a');
    cylGrad.addColorStop(0.3, '#334155');
    cylGrad.addColorStop(0.5, '#94a3b8');
    cylGrad.addColorStop(0.8, '#1e293b');
    cylGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = cylGrad;
    ctx.beginPath();
    ctx.roundRect(h.left, h.top, h.width, h.height, 2);
    ctx.fill();

    // Outline for crisp separation from white canvas
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cylindrical tennis grip flared butt-cap at the base
    const buttW = h.width + 3;
    const buttLeft = hCX - buttW / 2;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(buttLeft, h.bottom - 4, buttW, 4, 1.5);
    ctx.fill();

    // Golden frame-joint collar ring
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(h.left - 1, h.top - 1, h.width + 2, 3);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(h.left - 1, h.top - 1, h.width + 2, 3);

    // Diagonal spiral grip tape wrap ridges across the cylindrical shaft
    ctx.strokeStyle = this.isFacingRight ? '#3b82f6' : '#ef4444';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let sy = h.top + 3; sy < h.bottom - 4; sy += 3.5) {
      ctx.moveTo(h.left + 0.5, sy);
      ctx.lineTo(h.right - 0.5, sy + 2);
    }
    ctx.stroke();

    // Specular highlight line along cylinder length
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(h.left + 2, h.top + 2);
    ctx.lineTo(h.left + 2, h.bottom - 5);
    ctx.stroke();

    // 2. Oval Head (Frame and Strings with Enlarged Super-Shot Target Zone)
    const hd = rb.head;

    // Outer Frame (Oval) with crisp contrast against white
    const frameColor = this.isFacingRight ? '#2563eb' : '#dc2626';
    const hitFrameColor = isSweetSpotHit ? '#f59e0b' : '#fbbf24';

    // Soft frame fill
    ctx.fillStyle = isSweetSpotHit ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(hd.centerX, hd.centerY, hd.radiusX, hd.radiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Frame stroke: crisp black outline + bold colored frame for high pop
    ctx.lineWidth = isSweetSpotHit ? 5.5 : (headHit ? 4.5 : 3.5);
    ctx.strokeStyle = headHit ? hitFrameColor : frameColor;
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Cross-woven strings in dark charcoal for sharp contrast on white
    ctx.strokeStyle = isSweetSpotHit ? '#d97706' : 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();

    // Vertical strings (longitudinal)
    for (let dx = -hd.radiusX + 4; dx < hd.radiusX; dx += 4) {
      const hAtX = hd.radiusY * Math.sqrt(Math.max(0, 1 - (dx / hd.radiusX) ** 2));
      ctx.moveTo(hd.centerX + dx, hd.centerY - hAtX + 2);
      ctx.lineTo(hd.centerX + dx, hd.centerY + hAtX - 2);
    }

    // Horizontal strings (cross)
    for (let dy = -hd.radiusY + 6; dy < hd.radiusY; dy += 6) {
      const wAtY = hd.radiusX * Math.sqrt(Math.max(0, 1 - (dy / hd.radiusY) ** 2));
      ctx.moveTo(hd.centerX - wAtY + 2, hd.centerY + dy);
      ctx.lineTo(hd.centerX + wAtY - 2, hd.centerY + dy);
    }
    ctx.stroke();

    // 3. Super-Shot Focus Area: Visibly shown as a small, luminous target zone
    const targetW = this.config.racket.sweetSpotWidth || 16;
    const targetH = this.config.racket.sweetSpotHeight || 18;
    const targetLeft = hd.centerX - targetW / 2;
    const targetTop = hd.centerY - targetH / 2;

    // Golden sweet-spot target aperture
    ctx.fillStyle = isSweetSpotHit ? 'rgba(245, 158, 11, 0.35)' : 'rgba(251, 191, 36, 0.2)';
    ctx.beginPath();
    ctx.roundRect(targetLeft, targetTop, targetW, targetH, 4);
    ctx.fill();

    ctx.strokeStyle = isSweetSpotHit ? '#d97706' : '#f59e0b';
    ctx.lineWidth = isSweetSpotHit ? 2 : 1.4;
    ctx.stroke();

    // Corner reticle tick marks on target zone
    const cornerSize = 3.5;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    // Top-left
    ctx.moveTo(targetLeft, targetTop + cornerSize);
    ctx.lineTo(targetLeft, targetTop);
    ctx.lineTo(targetLeft + cornerSize, targetTop);
    // Top-right
    ctx.moveTo(targetLeft + targetW - cornerSize, targetTop);
    ctx.lineTo(targetLeft + targetW, targetTop);
    ctx.lineTo(targetLeft + targetW, targetTop + cornerSize);
    // Bottom-left
    ctx.moveTo(targetLeft, targetTop + targetH - cornerSize);
    ctx.lineTo(targetLeft, targetTop + targetH);
    ctx.lineTo(targetLeft + cornerSize, targetTop + targetH);
    // Bottom-right
    ctx.moveTo(targetLeft + targetW - cornerSize, targetTop + targetH);
    ctx.lineTo(targetLeft + targetW, targetTop + targetH);
    ctx.lineTo(targetLeft + targetW, targetTop + targetH - cornerSize);
    ctx.stroke();

    // Center crosshair pip
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(hd.centerX, hd.centerY, isSweetSpotHit ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Sweet spot super-shot starburst cue and expanding impact shockwave ring
    if (isSweetSpotHit) {
      // Expanding golden impact shockwave ring
      const progress = 1 - (this.hitEffectTimer / 0.18);
      const ringRadius = 12 + progress * 24;
      const ringAlpha = (1 - progress) * 0.75;
      ctx.strokeStyle = `rgba(245, 158, 11, ${ringAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(hd.centerX, hd.centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Starburst rays
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(hd.centerX + Math.cos(ang) * 5, hd.centerY + Math.sin(ang) * 5);
        ctx.lineTo(hd.centerX + Math.cos(ang) * 16, hd.centerY + Math.sin(ang) * 16);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawFestiveCharacter(ctx, isBombPhase = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const dir = this.isFacingRight ? 1 : -1;
    const isP1 = this.id === 'p1';
    const isHitting = this.hitEffectTimer > 0;
    const isSweetSpotHit = isHitting && this.hitZoneType === 'SWEET_SPOT';

    // Expressive dynamic squash, stretch, and movement tilt
    let scaleX = 1;
    let scaleY = 1;
    let tiltAngle = 0;
    if (this.jumpSquashTimer > 0) {
      // Crisp athletic launch stretch
      scaleY = 1.18;
      scaleX = 0.86;
      tiltAngle = dir * 0.08;
    } else if (this.vy < -70) {
      // Athletic rising posture
      scaleY = 1.08;
      scaleX = 0.93;
      tiltAngle = dir * 0.05;
    } else if (this.vy > 120) {
      // Landing / descent compression squash
      scaleY = 0.91;
      scaleX = 1.08;
    }
    ctx.rotate(tiltAngle);
    ctx.scale(scaleX, scaleY);

    const halfW = this.width / 2;
    const halfH = this.height / 2;

    // 1. Royal Festive Kurta (Torso)
    ctx.fillStyle = this.kurtaColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 4, -halfH + 18, this.width - 8, halfH + 4, 6);
    ctx.fill();

    // Crisp dark outline for popping against white canvas
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Golden Shimmering Kurta Borders & Angavastram Stole
    ctx.fillStyle = this.kurtaTrim;
    ctx.fillRect(-halfW + 5, -halfH + 18, this.width - 10, 3.5);

    // Diagonal sash with distinctive character accents
    ctx.strokeStyle = isP1 ? '#f59e0b' : '#059669'; // Saffron gold for P1, Emerald silk for P2
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-halfW + 6, -halfH + 20);
    ctx.lineTo(halfW - 6, 12);
    ctx.stroke();

    // Secondary trim line on sash for royal richness
    ctx.strokeStyle = isP1 ? '#fde68a' : '#34d399';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-halfW + 7, -halfH + 21);
    ctx.lineTo(halfW - 7, 11);
    ctx.stroke();

    // 2. Traditional Churidar / Silk Dhoti Pants
    ctx.fillStyle = isP1 ? '#f8fafc' : '#f1f5f9';
    ctx.fillRect(-halfW + 6, 6, this.width - 12, 12);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-halfW + 6, 6, this.width - 12, 12);

    // Legs
    ctx.fillStyle = '#fed7aa'; // Skin
    ctx.fillRect(-8, 18, 5, 12);
    ctx.fillRect(3, 18, 5, 12);
    ctx.strokeRect(-8, 18, 5, 12);
    ctx.strokeRect(3, 18, 5, 12);

    // Festive golden mojari / shoes with curled toe tips
    ctx.fillStyle = this.shoeColor;
    ctx.fillRect(-10, 26, 8, 5);
    ctx.fillRect(2, 26, 8, 5);
    ctx.fillStyle = isP1 ? '#ea580c' : '#991b1b';
    ctx.fillRect(-10, 29, 8, 2);
    ctx.fillRect(2, 29, 8, 2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-10, 26, 8, 5);
    ctx.strokeRect(2, 26, 8, 5);

    // 3. Head & Distinct Festive Turban / Pagri Silhouettes
    const headY = -halfH + 9;
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, headY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Royal Festive Pagri / Turban base
    ctx.fillStyle = this.turbanColor;
    ctx.beginPath();
    ctx.ellipse(0, headY - 4, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Distinct character turban ornaments & silhouettes:
    if (isP1) {
      // P1: Tall upward-sweeping royal Kalgi feather plume silhouette
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(dir * 5, headY - 8);
      ctx.quadraticCurveTo(dir * 8, headY - 20, dir * 4, headY - 24);
      ctx.quadraticCurveTo(dir * 1, headY - 16, dir * 4, headY - 8);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Secondary feather plume ridge
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(dir * 4, headY - 9);
      ctx.quadraticCurveTo(dir * 6, headY - 18, dir * 3.5, headY - 22);
      ctx.lineTo(dir * 4, headY - 9);
      ctx.fill();

      // Plume sapphire gem
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 8, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else {
      // P2: Flared regal crown with emerald peacock aigrette brooch curved to side
      ctx.fillStyle = '#059669'; // Emerald aigrette
      ctx.beginPath();
      ctx.moveTo(dir * 5, headY - 8);
      ctx.quadraticCurveTo(dir * 11, headY - 18, dir * 8, headY - 22);
      ctx.quadraticCurveTo(dir * 3, headY - 16, dir * 4, headY - 8);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Golden aigrette accent
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(dir * 4, headY - 9);
      ctx.quadraticCurveTo(dir * 8, headY - 16, dir * 6, headY - 20);
      ctx.lineTo(dir * 4, headY - 9);
      ctx.fill();

      // Ruby brooch cabochon
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 8, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // 4. Dynamic Facial Expression: Alarmed Dodge vs Starburst Super vs Hit Wink vs Focused Play
    if (isBombPhase) {
      // 💣 BOMB PHASE: High-tension wide alarmed eyes, high arched brow, and panic sweat bead!
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 1, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Dilated alarmed pupil
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(dir * (5 + (dir > 0 ? 0.8 : -0.8)), headY - 1, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // High arched anxious eyebrow
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(dir * 2, headY - 7);
      ctx.lineTo(dir * 7, headY - 6);
      ctx.stroke();

      // Stylized panic sweat bead above brow
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(dir * 9, headY - 9, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Tense focused mouth
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(dir * 2, headY + 5);
      ctx.lineTo(dir * 5, headY + 4);
      ctx.lineTo(dir * 7, headY + 5.5);
      ctx.stroke();
    } else if (isSweetSpotHit) {
      // ⚡ SWEET SPOT HIT: Radiant starburst glint eye and big victorious athletic smile!
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 5, headY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Golden 4-point star in pupil
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      const sx = dir * 5, sy = headY;
      ctx.moveTo(sx, sy - 3);
      ctx.lineTo(sx + 1, sy - 1);
      ctx.lineTo(sx + 3, sy);
      ctx.lineTo(sx + 1, sy + 1);
      ctx.lineTo(sx, sy + 3);
      ctx.lineTo(sx - 1, sy + 1);
      ctx.lineTo(sx - 3, sy);
      ctx.lineTo(sx - 1, sy - 1);
      ctx.closePath();
      ctx.fill();

      // Radiant smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(dir * 3.5, headY + 4.5, 3.5, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else if (isHitting) {
      // 🎾 NORMAL HIT: Spirited hit wink and athletic exertion smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(dir * 2.5, headY - 2);
      ctx.lineTo(dir * 7.5, headY);
      ctx.lineTo(dir * 2.5, headY + 2);
      ctx.stroke();

      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(dir * 3.5, headY + 5, 3, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (this.vy < -70) {
      // 🚀 RISING JUMP: Keen upward gaze with determined smile
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(dir * 5, headY - 1.8, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(dir * 3.5, headY + 4.5, 2.8, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // 🎾 NORMAL PLAY: Athletic focused eye looking forward towards court center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * 5, headY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pupil with crisp reflection glint
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(dir * (5 + (dir > 0 ? 0.8 : -0.8)), headY, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dir * (5 + (dir > 0 ? 1.2 : -1.2)), headY - 0.6, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Confident match smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(dir * 3.5, headY + 5, 3, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }
}
