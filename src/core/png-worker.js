import { renderWallpaper } from './canvas-renderer.js';
import { validateDimensions, validateRenderState } from './scene.js';
import { releaseCanvas } from './canvas.js';

self.onmessage = async ({ data: { state, width, height } }) => {
  let canvas;
  try {
    if (typeof OffscreenCanvas !== 'function') { self.postMessage({ type: 'unsupported' }); return; }
    validateDimensions(width, height); validateRenderState(state);
    canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) { self.postMessage({ type: 'unsupported' }); return; }
    self.postMessage({ type: 'progress', stage: 'rendering' });
    renderWallpaper(ctx, state, width, height);
    self.postMessage({ type: 'progress', stage: 'encoding' });
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    self.postMessage({ type: 'done', blob });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'PNG 编码失败' });
  } finally { releaseCanvas(canvas); }
};
