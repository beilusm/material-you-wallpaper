import { createRNG } from './geometry.js';
import { createDrawingCanvas } from './canvas.js';

// A small bounded cache avoids retaining one canvas per randomized wallpaper.
const noiseTiles = new Map();
export const NOISE_TILE_SIZE = 256;

export function getNoiseTile(seed = 42) {
  if (noiseTiles.has(seed)) return noiseTiles.get(seed);
  const canvas = createDrawingCanvas(NOISE_TILE_SIZE, NOISE_TILE_SIZE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器无法创建颗粒画布');
  const image = ctx.createImageData(NOISE_TILE_SIZE, NOISE_TILE_SIZE);
  const rng = createRNG(seed);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor(rng() * 255);
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 45;
  }
  ctx.putImageData(image, 0, 0);
  if (noiseTiles.size >= 4) noiseTiles.delete(noiseTiles.keys().next().value);
  noiseTiles.set(seed, canvas);
  return canvas;
}

export function applyFilmGrain(ctx, width, height, intensity = 0.08, seed = 42) {
  if (intensity <= 0.005) return;
  ctx.save();
  try {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
    ctx.globalAlpha = Math.min(0.35, intensity);
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(getNoiseTile(seed), 'repeat');
    if (!pattern) throw new Error('浏览器无法创建颗粒纹理');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  } finally {
    ctx.restore();
  }
}

export function bandGradientCoordinates(angleDeg, width, height) {
  const rad = angleDeg * Math.PI / 180;
  const len = Math.max(width, height) * 0.8;
  const dx = Math.cos(rad) * len;
  const dy = Math.sin(rad) * len;
  return { x1: width / 2 - dx, y1: height / 2 - dy, x2: width / 2 + dx, y2: height / 2 + dy };
}

export function createBandGradient(ctx, colorA, colorB, angleDeg, width, height) {
  return createSceneFill(ctx, { ...bandGradientCoordinates(angleDeg, width, height), colorA, colorB });
}

export function createSceneFill(ctx, fill) {
  if (typeof fill === 'string') return fill;
  const gradient = ctx.createLinearGradient(fill.x1, fill.y1, fill.x2, fill.y2);
  gradient.addColorStop(0, fill.colorA);
  gradient.addColorStop(1, fill.colorB);
  return gradient;
}
