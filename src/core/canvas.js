/** DOM canvases support SVG texture embedding; workers use OffscreenCanvas. */
export function createDrawingCanvas(width, height, { offscreen = false } = {}) {
  let canvas;
  if (!offscreen && typeof document !== 'undefined') canvas = document.createElement('canvas');
  else if (typeof OffscreenCanvas === 'function') canvas = new OffscreenCanvas(width, height);
  else throw new Error('浏览器不支持后台画布');
  canvas.width = width; canvas.height = height;
  return canvas;
}

export function releaseCanvas(canvas) {
  if (canvas) canvas.width = canvas.height = 0;
}
