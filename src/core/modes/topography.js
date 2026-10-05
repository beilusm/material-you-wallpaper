import { createRNG } from '../geometry.js';
import { polygonPath } from '../path.js';

export function buildTopographyLayers(state, width, height) {
  const rng = createRNG(state.seed);
  const cx = width * (0.35 + rng() * 0.3);
  const cy = height * (0.35 + rng() * 0.3);
  const maxR = Math.hypot(width, height) * 0.75;
  const count = Math.max(3, state.bandCount + 2);
  const layers = [];
  for (let l = count; l >= 1; l--) {
    const rBase = maxR * l / count;
    const phase = rng() * Math.PI * 2;
    const points = [];
    for (let i = 0; i <= 60; i++) {
      const theta = i * Math.PI * 2 / 60;
      const offset = rBase * state.curvature * (
        0.15 * Math.sin(theta * (2 + state.harmonics) + phase) +
        0.08 * Math.cos(theta * 2 - phase));
      const r = Math.max(10, rBase + offset);
      points.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
    }
    layers.push({
      path: polygonPath(points), colorIndex: l,
      shadow: { color: '#101a14', opacity: 0.15, blur: Math.min(width, height) * 0.025, x: 0, y: 4 }
    });
  }
  return layers;
}
