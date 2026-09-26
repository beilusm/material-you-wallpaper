import { calculateBandPolygon } from './geometry.js';

/**
 * 在目标 2D 上下文上绘制完整的 Material You 壁纸
 */
export function renderWallpaper(ctx, state, width, height) {
  const colors = [state.color2, state.color1];

  // 1. 底色全屏覆盖
  ctx.fillStyle = colors[0];
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

    // 层次阴影 (Material 3 Paper Elevation)
    if (state.hasShadow) {
      ctx.shadowColor = 'rgba(18, 28, 22, 0.14)';
      ctx.shadowBlur = Ln * 0.018;
      ctx.shadowOffsetX = -nx * 6;
      ctx.shadowOffsetY = -ny * 6;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
  }
}

/**
 * 离线导出高精度 PNG Blob
 */
export function exportToPNGBlob(state, width, height) {
  return new Promise((resolve) => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportCtx = exportCanvas.getContext('2d');

    renderWallpaper(exportCtx, state, width, height);

    exportCanvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}
