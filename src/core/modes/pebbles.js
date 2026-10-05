import { createRNG } from '../geometry.js';
import { closedSplinePath } from '../path.js';

export function buildPebbleLayers(state, width, height) {
  const rng = createRNG(state.seed);
  const minDim = Math.min(width, height);
  const layers = [];
  for (let i = 0; i < Math.max(3, state.bandCount + 1); i++) {
    const cx = width * (0.2 + rng() * 0.6);
    const cy = height * (0.2 + rng() * 0.6);
    const baseR = minDim * (0.18 + rng() * 0.22) * (0.7 + state.curvature * 0.6);
    const numPoints = 8 + Math.floor(rng() * 4);
    const rot = rng() * Math.PI * 2;
    const points = [];
    for (let j = 0; j < numPoints; j++) {
      const theta = rot + j * Math.PI * 2 / numPoints;
      const r = baseR * (1 + (rng() - 0.5) * 0.35 * state.curvature);
      points.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
    }
    layers.push({
      path: closedSplinePath(points), colorIndex: i,
      shadow: { color: '#101a14', opacity: 0.18, blur: minDim * 0.04, x: 0, y: minDim * 0.015 }
    });
  }
  return layers;
}
