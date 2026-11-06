/**
 * Court Module (White-Canvas Presentation)
 * Renders a clean, bright white canvas / paper-like court with an uncluttered
 * play area, sparse black line accents, and crisp boundary markings.
 */

export class Court {
  constructor(config) {
    this.config = config;
    this.centerX = config.court.width / 2;
  }

  updateConfig(config) {
    this.config = config;
    this.centerX = config.court.width / 2;
  }

  update(dt) {
    // Uncluttered presentation — no heavy background animations
  }

  draw(ctx) {
    const { width, height, groundY, ceilingY } = this.config.court;

    // 1. Clean, bright white canvas play area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 2. Ceiling boundary: Crisp black line accent with subtle golden corner stops
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(16, ceilingY);
    ctx.lineTo(width - 16, ceilingY);
    ctx.stroke();

    // Subtle golden corner terminal pips
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(16, ceilingY - 3, 5, 6);
    ctx.fillRect(width - 21, ceilingY - 3, 5, 6);
    ctx.restore();

    // 3. Ground Baseline: Crisp black line accent along court ground
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, groundY);
    ctx.lineTo(width - 16, groundY);
    ctx.stroke();

    // 4. Subtle sparse court floor division markings (below groundY)
    const p1BaseX = this.config.court.baselineP1X;
    const p2BaseX = this.config.court.baselineP2X;
    const midX = width / 2;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // P1 baseline indicator tick
    ctx.moveTo(p1BaseX, groundY);
    ctx.lineTo(p1BaseX, groundY + 12);
    // P2 baseline indicator tick
    ctx.moveTo(p2BaseX, groundY);
    ctx.lineTo(p2BaseX, groundY + 12);
    // Center open-court marker tick
    ctx.moveTo(midX, groundY);
    ctx.lineTo(midX, groundY + 16);
    ctx.stroke();

    // Light subtle bottom boundary line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, height - 8);
    ctx.lineTo(width - 24, height - 8);
    ctx.stroke();

    ctx.restore();
  }
}
