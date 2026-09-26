import { createRNG } from '../geometry.js';
import { createBandGradient } from '../effects.js';

/**
 * 绘制平滑闭合样条曲线 (Catmull-Rom 闭合路径)
 */
function drawClosedSpline(ctx, points, tension = 0.5) {
  if (points.length < 3) return;
  const n = points.length;

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    // Catmull-Rom to Cubic Bezier control points
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    if (i === 0) {
      ctx.moveTo(p1.x, p1.y);
    }
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.closePath();
}

/**
 * 生成有机圆石 (Material You Pebble Blobs) 模式
 */
export function renderPebbles(ctx, state, width, height) {
  const rng = createRNG(state.seed);
  const colors = [state.color2, state.color1];

  // 底色填充
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, width, height);

  const numPebbles = Math.max(3, state.bandCount + 1);
  const minDim = Math.min(width, height);

  // 预生成鹅卵石分布
  for (let i = 0; i < numPebbles; i++) {
    const cx = width * (0.2 + rng() * 0.6);
    const cy = height * (0.2 + rng() * 0.6);
    const baseR = minDim * (0.18 + rng() * 0.22) * (0.7 + state.curvature * 0.6);

    const numPoints = 8 + Math.floor(rng() * 4);
    const points = [];
    const rot = rng() * Math.PI * 2;

    for (let j = 0; j < numPoints; j++) {
      const theta = rot + (j * Math.PI * 2) / numPoints;
      // 径向扰动
      const rVar = 1 + (rng() - 0.5) * 0.35 * state.curvature;
      const r = baseR * rVar;
      points.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta)
      });
    }

    if (state.hasShadow) {
      ctx.shadowColor = 'rgba(16, 26, 20, 0.18)';
      ctx.shadowBlur = minDim * 0.04;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = minDim * 0.015;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    const c = colors[i % colors.length];
    if (state.useGradient) {
      const nextC = colors[(i + 1) % colors.length];
      ctx.fillStyle = createBandGradient(ctx, c, nextC, state.angle, width, height);
    } else {
      ctx.fillStyle = c;
    }

    drawClosedSpline(ctx, points, 1.0);
    ctx.fill();
  }
}
