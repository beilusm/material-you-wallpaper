import { validateDimensions, validateRenderState } from './scene.js';
import { snapshotWallpaper } from './state.js';
import { renderWallpaper } from './canvas-renderer.js';
import { createDrawingCanvas, releaseCanvas } from './canvas.js';

const EXPORT_TIMEOUT_MS = 120000;
const timeoutError = () => new Error('导出耗时过长，请降低分辨率后重试');

class WorkerUnavailableError extends Error {
  constructor(message) { super(message); this.name = 'WorkerUnavailableError'; }
}

function abortError() { return new DOMException('导出已取消', 'AbortError'); }
function checkAbort(signal) { if (signal?.aborted) throw abortError(); }

function validateBlob(blob) {
  if (!(blob instanceof Blob) || !blob.size || blob.type !== 'image/png') {
    throw new Error('PNG 编码失败，请尝试降低输出分辨率');
  }
  return blob;
}

function exportInWorker(state, width, height, { signal, onProgress }) {
  return new Promise((resolve, reject) => {
    let worker, timer, settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      worker?.terminate();
    };
    function finish(error, blob) {
      if (settled) return;
      settled = true; cleanup();
      if (error) reject(error);
      else {
        try { resolve(validateBlob(blob)); } catch (cause) { reject(cause); }
      }
    }
    const cancel = () => finish(abortError());
    try {
      checkAbort(signal);
      worker = new Worker(new URL('./png-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => {
        if (data.type === 'progress') {
          try { onProgress?.(data.stage); } catch (error) { finish(error); }
        } else if (data.type === 'done') finish(null, data.blob);
        else if (data.type === 'unsupported') finish(new WorkerUnavailableError('后台画布不可用'));
        else if (data.type === 'error') finish(new Error(data.message || '后台导出失败'));
      };
      worker.onerror = event => {
        event.preventDefault();
        finish(new WorkerUnavailableError('后台导出无法启动'));
      };
      worker.onmessageerror = () => finish(new WorkerUnavailableError('后台导出数据无法读取'));
      timer = setTimeout(() => finish(timeoutError()), EXPORT_TIMEOUT_MS);
      signal?.addEventListener('abort', cancel, { once: true });
      worker.postMessage({ state, width, height });
    } catch (error) {
      finish(error.name === 'AbortError' ? error : new WorkerUnavailableError(error.message));
    }
  });
}

/** Compatibility path for browsers without worker-based 2D canvas rendering. */
export function exportPNGOnMainThread(state, width, height, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    let canvas, timer, settled = false;
    const finish = (error, blob) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      releaseCanvas(canvas);
      if (error) reject(error);
      else {
        try { resolve(validateBlob(blob)); } catch (cause) { reject(cause); }
      }
    };
    const cancel = () => finish(abortError());
    try {
      checkAbort(signal);
      validateDimensions(width, height);
      validateRenderState(state);
      timer = setTimeout(() => finish(timeoutError()), EXPORT_TIMEOUT_MS);
      signal?.addEventListener('abort', cancel, { once: true });
      canvas = createDrawingCanvas(width, height);
      onProgress?.('rendering');
      checkAbort(signal);
      renderWallpaper(canvas.getContext('2d'), state, width, height);
      onProgress?.('encoding');
      checkAbort(signal);
      canvas.toBlob(blob => finish(null, blob), 'image/png');
    } catch (error) { finish(error); }
  });
}

function yieldBeforeFallback(signal) {
  return new Promise((resolve, reject) => {
    let frame, task, deadline, settled = false;
    const cleanup = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      clearTimeout(task); clearTimeout(deadline);
      signal?.removeEventListener('abort', cancel);
    };
    const finish = () => {
      if (settled) return;
      settled = true; cleanup(); resolve();
    };
    const cancel = () => {
      if (settled) return;
      settled = true; cleanup(); reject(abortError());
    };
    signal?.addEventListener('abort', cancel, { once: true });
    // The timeout also covers a tab becoming hidden before its next animation frame.
    deadline = setTimeout(finish, 50);
    if (typeof requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(() => { task = setTimeout(finish, 0); });
    } else task = setTimeout(finish, 0);
    if (signal?.aborted) cancel();
  });
}

export async function exportToPNGBlob(state, width, height, options = {}) {
  const { signal, onProgress, preferWorker = true } = options;
  checkAbort(signal);
  validateDimensions(width, height);
  validateRenderState(state);
  const snapshot = snapshotWallpaper(state);
  if (preferWorker && typeof Worker === 'function' && typeof OffscreenCanvas === 'function' &&
      typeof OffscreenCanvas.prototype.convertToBlob === 'function') {
    try { return await exportInWorker(snapshot, width, height, { signal, onProgress }); }
    catch (error) { if (error.name !== 'WorkerUnavailableError') throw error; }
  }
  await yieldBeforeFallback(signal);
  checkAbort(signal);
  return exportPNGOnMainThread(snapshot, width, height, { signal, onProgress });
}

export function copyImageToClipboard(state, width, height, options = {}) {
  if (!navigator.clipboard?.write || !window.ClipboardItem ||
      (window.ClipboardItem.supports && !window.ClipboardItem.supports('image/png'))) {
    return Promise.reject(new Error('当前浏览器不支持直接复制图片到剪贴板'));
  }
  const blob = exportToPNGBlob(state, width, height, options);
  // Clipboard permission can reject before the encoder finishes; observe both promises.
  blob.catch(() => {});
  try {
    return navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]).catch(error => {
      throw clipboardError(error);
    });
  } catch (error) { return Promise.reject(clipboardError(error)); }
}

function clipboardError(error) {
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    return new Error('无法写入剪贴板，请允许浏览器访问剪贴板，或下载 PNG');
  }
  return error;
}
