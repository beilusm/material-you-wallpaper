/**
 * 质感与材质特效模块
 */

// 预计算的无缝平铺噪点 Canvas 缓存
let noiseCanvasCache = null;

function getNoiseTile(size = 256) {
  if (noiseCanvasCache) return noiseCanvasCache;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');
  const imgData = nCtx.createImageData(size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data[i] = v;     // R
    data[i + 1] = v; // G
    data[i + 2] = v; // B
    data[i + 3] = 45; // 基础透明度
  }

  nCtx.putImageData(imgData, 0, 0);
  noiseCanvasCache = nCanvas;
  return nCanvas;
}

/**
 * 为目标画布添加细腻胶片噪点质感 (Subtle Film Grain)
 * 提升数码矢量图的温润与实体纸质观感
 */
export function applyFilmGrain(ctx, width, height, intensity = 0.08) {
  if (intensity <= 0.005) return;

  const tile = getNoiseTile(256);
  ctx.save();
  ctx.globalAlpha = Math.min(0.35, intensity);
  ctx.globalCompositeOperation = 'overlay';

  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * 构造柔和双色渐变
 */
export function createBandGradient(ctx, colorA, colorB, angleDeg, width, height) {
  const rad = (angleDeg * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.max(width, height) * 0.8;

  const dx = Math.cos(rad) * len;
  const dy = Math.sin(rad) * len;

  const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  return grad;
}
