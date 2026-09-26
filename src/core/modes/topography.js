import { createRNG } from '../geometry.js';
import { createBandGradient } from '../effects.js';

/**
 * 绘制同心等高阶梯纸艺层叠 (Topographic Paper Cut) 模式
 */
export function renderTopography(ctx, state, width, height) {
  const rng = createRNG(state.seed);
  const colors = [state.color2, state.color1];

  // 底色
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, width, height);

  const cx = width * (0.35 + rng() * 0.3);
  const cy = height * (0.35 + rng() * 0.3);
  const maxR = Math.hypot(width, height) * 0.75;
  const layers = Math.max(3, state.bandCount + 2);

  // 从大到小绘制各层等高线
  for (let l = layers; l >= 1; l--) {
    const fraction = l / layers;
    const rBase = maxR * fraction;
    const numPoints = 60;
    const pts = [];

    const pFreq = 2 + state.harmonics;
    const phase = rng() * Math.PI * 2;

    for (let i = 0; i <= numPoints; i++) {
      const theta = (i * Math.PI * 2) / numPoints;
      const offset = (rBase * 0.15 * state.curvature) * Math.sin(theta * pFreq + phase)
                   + (rBase * 0.08 * state.curvature) * Math.cos(theta * 2 - phase);
      const r = Math.max(10, rBase + offset);
      pts.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta)
      });
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length; j++) {
      ctx.lineTo(pts[j].x, pts[j].y);
    }
    ctx.closePath();

    if (state.hasShadow) {
      ctx.shadowColor = 'rgba(16, 26, 20, 0.15)';
      ctx.shadowBlur = Math.min(width, height) * 0.025;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    const c = colors[l % colors.length];
    if (state.useGradient) {
      const nextC = colors[(l + 1) % colors.length];
      ctx.fillStyle = createBandGradient(ctx, c, nextC, state.angle, width, height);
    } else {
      ctx.fillStyle = c;
    }
    ctx.fill();
  }
}
