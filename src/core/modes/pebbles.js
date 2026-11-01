import { createRNG, createRadialProfile } from '../geometry.js';
import { closedSplinePath } from '../path.js';

/** Pebbles shrink and deepen from back to front; best-candidate placement keeps them spread out. */
export function buildPebbleLayers(state, width, height) {
  const rng = createRNG(state.seed);
  const minDim = Math.min(width, height);
  const count = Math.max(3, state.bandCount + 1);
  const wobble = 0.04 + state.curvature * 0.2;
  const placed = [];
  const layers = [];
  for (let i = 0; i < count; i++) {
    const radius = minDim * (0.36 - 0.2 * i / (count - 1)) * (0.85 + rng() * 0.3);
    let best = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const x = width * (0.12 + rng() * 0.76), y = height * (0.12 + rng() * 0.76);
      const score = Math.min(Infinity, ...placed.map(p => Math.hypot(x - p.x, y - p.y) / (radius + p.radius)));
      if (!best || score > best.score) best = { x, y, score };
    }
    placed.push({ x: best.x, y: best.y, radius });
    const profile = createRadialProfile(rng, [2, 3, 4]);
    const points = Array.from({ length: 48 }, (_, j) => {
      const theta = j * Math.PI * 2 / 48;
      const r = radius * (1 + wobble * profile(theta));
      return { x: best.x + r * Math.cos(theta), y: best.y + r * Math.sin(theta) };
    });
    layers.push({
      path: closedSplinePath(points), tone: 0.35 + 0.65 * i / (count - 1),
      shadow: { color: '#101a14', opacity: 0.18, blur: minDim * 0.04, x: 0, y: minDim * 0.015 }
    });
  }
  return layers;
}
