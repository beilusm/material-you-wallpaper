import { calculateBandPolygon } from '../geometry.js';
import { createBandGradient } from '../effects.js';

export function renderWaves(ctx, state, width, height) {
  const colors = [state.color2, state.color1];

  // 1. 底色全屏覆盖
  if (state.useGradient) {
    ctx.fillStyle = createBandGradient(ctx, colors[0], colors[1], state.angle + 90, width, height);
  } else {
    ctx.fillStyle = colors[0];
  }
  ctx.fillRect(0, 0, width, height);

  // 2. 依次叠加绘制每道波浪
  for (let i = 1; i < state.bandCount; i++) {
    const waveParam = state.waveParams[i % state.waveParams.length];
    const { polygon, nx, ny, Ln } = calculateBandPolygon({
      index: i,
      totalBands: state.bandCount,
      width,
      height,
      angleDeg: state.angle,
      curvature: state.curvature,
      harmonics: state.harmonics,
      waveParam,
      steps: 160
    });

    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let j = 1; j < polygon.length; j++) {
      ctx.lineTo(polygon[j].x, polygon[j].y);
    }
    ctx.closePath();

    if (state.hasShadow) {
      ctx.shadowColor = 'rgba(18, 28, 22, 0.16)';
      ctx.shadowBlur = Ln * 0.02;
      ctx.shadowOffsetX = -nx * 7;
      ctx.shadowOffsetY = -ny * 7;
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
    ctx.fill();
  }
}
