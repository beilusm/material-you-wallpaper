import { rgbToHsl, hslToHex } from './color.js';

const FALLBACK = { c1: '#b2ccc1', c2: '#e7f2ed' };
const SAMPLE_SIZE = 128;

/** Quantized dominant-color sampling ignores transparent pixels and isolated noise. */
export function extractPaletteFromPixels(data) {
  const buckets = new Map();
  for (let i = 0; i + 3 < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha < 0.1) continue;
    const r = Math.round(data[i] * alpha + 255 * (1 - alpha));
    const g = Math.round(data[i + 1] * alpha + 255 * (1 - alpha));
    const b = Math.round(data[i + 2] * alpha + 255 * (1 - alpha));
    const key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4);
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += alpha;
    bucket.r += r * alpha; bucket.g += g * alpha; bucket.b += b * alpha;
    buckets.set(key, bucket);
  }
  if (buckets.size === 0) return { ...FALLBACK };
  let best = null;
  for (const bucket of buckets.values()) {
    const hsl = rgbToHsl(bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count);
    const score = bucket.count * (0.25 + hsl.s / 100);
    if (!best || score > best.score) best = { ...hsl, score };
  }
  const saturation = best.s < 8 ? 0 : Math.min(55, Math.max(18, best.s));
  return {
    c1: hslToHex(best.h, saturation, Math.min(70, Math.max(42, best.l))),
    c2: hslToHex(best.h, saturation * 0.45, 94)
  };
}

function cancellationReason(signal) {
  return signal.reason || new DOMException('图片分析已取消', 'AbortError');
}

function checkAbort(signal) {
  if (signal?.aborted) throw cancellationReason(signal);
}

// Bitmap decoding has no native cancellation. Stop waiting immediately and close
// a bitmap if the browser finishes creating it after the request was canceled.
function decodeBitmap(file, signal) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, bitmap) => {
      if (settled) { bitmap?.close(); return; }
      settled = true;
      signal?.removeEventListener('abort', cancel);
      if (error) reject(error); else resolve(bitmap);
    };
    const cancel = () => finish(cancellationReason(signal));
    try {
      checkAbort(signal);
      signal?.addEventListener('abort', cancel, { once: true });
      Promise.resolve(createImageBitmap(file, {
        resizeWidth: SAMPLE_SIZE, resizeHeight: SAMPLE_SIZE, resizeQuality: 'high'
      })).then(bitmap => finish(null, bitmap), error => finish(error));
    } catch (error) { finish(error); }
  });
}

async function decodeImage(file, signal) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await decodeBitmap(file, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      // SVG and older browsers can still use the image-element path.
    }
  }
  checkAbort(signal);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      const finish = error => {
        image.onload = image.onerror = null;
        signal?.removeEventListener('abort', cancel);
        if (error) { image.removeAttribute('src'); reject(error); } else resolve();
      };
      const cancel = () => finish(cancellationReason(signal));
      image.onload = () => finish();
      image.onerror = () => finish(new Error('图片无法读取，请使用 PNG、JPEG 或 WebP 等图片'));
      signal?.addEventListener('abort', cancel, { once: true });
      image.src = url;
      if (signal?.aborted) cancel();
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractPaletteFromImage(file, { signal } = {}) {
  checkAbort(signal);
  if (!(file instanceof Blob) || file.size === 0 || (file.type && !file.type.startsWith('image/'))) {
    throw new TypeError('请选择有效的图片文件');
  }
  if (file.size > 40 * 1024 * 1024) throw new RangeError('图片超过 40 MB，请先缩小后再取色');
  const image = await decodeImage(file, signal);
  let canvas;
  try {
    checkAbort(signal);
    canvas = document.createElement('canvas');
    canvas.width = canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('浏览器无法读取图片像素');
    ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return extractPaletteFromPixels(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
  } finally {
    if (typeof image.close === 'function') image.close(); else image.removeAttribute('src');
    if (canvas) canvas.width = canvas.height = 0;
  }
}
