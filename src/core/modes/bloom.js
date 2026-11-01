import { createRNG } from '../geometry.js';
import { closedSplinePath } from '../path.js';

/** Scalloped rosettes; each layer turns half a petal so the petals interleave. */
export function buildBloomLayers(state, width, height) {
  const rng = createRNG(state.seed);
  const minDim = Math.min(width, height);
  const count = state.bandCount + 1;
  const petals = [6, 8, 12][state.harmonics - 1];
  const cx = width * (0.3 + rng() * 0.4);
  const cy = height * (0.3 + rng() * 0.4);
  const outer = Math.hypot(width, height) * 0.42;
  const depth = 0.03 + state.curvature * 0.12;
  const spin = rng() * Math.PI * 2;
  const steps = petals * 8;
  const layers = [];
  for (let i = 0; i < count; i++) {
    const radius = outer * (1 - 0.78 * i / (count - 1));
    const rotation = spin + i * Math.PI / petals;
    const points = Array.from({ length: steps }, (_, j) => {
      const theta = j * Math.PI * 2 / steps;
      const r = radius * (1 + depth * Math.cos(petals * (theta - rotation)));
      return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
    });
    layers.push({
      path: closedSplinePath(points), tone: (i + 1) / count,
      shadow: { color: '#101a14', opacity: 0.18, blur: minDim * 0.035, x: 0, y: minDim * 0.01 }
    });
  }
  return layers;
}
