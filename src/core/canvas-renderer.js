import { createWallpaperScene } from './scene.js';
import { tracePath } from './path.js';
import { applyFilmGrain, createSceneFill } from './effects.js';

export function renderWallpaper(ctx, state, width, height) {
  if (!ctx) throw new Error('浏览器无法创建绘图画布');
  const scene = createWallpaperScene(state, width, height);
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    ctx.fillStyle = createSceneFill(ctx, scene.background);
    ctx.fillRect(0, 0, width, height);
    // Canvas shadows use device pixels, unlike path coordinates and gradients.
    const transform = ctx.getTransform();
    const scaleX = Math.hypot(transform.a, transform.b);
    const scaleY = Math.hypot(transform.c, transform.d);
    for (const layer of scene.layers) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
      if (layer.shadow) {
        const { color, opacity, blur, x, y } = layer.shadow;
        const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
        ctx.shadowColor = `${color}${alpha}`;
        ctx.shadowBlur = blur * (scaleX + scaleY) / 2;
        ctx.shadowOffsetX = transform.a * x + transform.c * y;
        ctx.shadowOffsetY = transform.b * x + transform.d * y;
      }
      ctx.fillStyle = createSceneFill(ctx, layer.fill);
      tracePath(ctx, layer.path);
      ctx.fill();
    }
    if (scene.grain > 0) applyFilmGrain(ctx, width, height, scene.grain, scene.seed);
  } finally {
    ctx.restore();
  }
}

