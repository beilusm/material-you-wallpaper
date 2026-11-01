import { createRNG } from '../geometry.js';
import { polygonPath } from '../path.js';

/** Ridgelines recede from a deep foreground to pale distant hills. */
export function buildHillLayers(state, width, height) {
  const rng = createRNG(state.seed);
  const minDim = Math.min(width, height);
  const count = state.bandCount + 1;
  const pad = width * 0.02, steps = 160;
  const layers = [];
  for (let i = 0; i < count; i++) {
    const depth = i / (count - 1);
    const base = height * (0.3 + 0.55 * depth);
    const amp = height * (0.05 + 0.13 * state.curvature) * (1 - 0.4 * depth);
    // Consume random values for all three terms so ruggedness changes do not reshuffle the scene.
    const terms = [1, 2.3, 4.7].map((freq, k) => ({
      freq: freq * (0.8 + rng() * 0.4), phase: rng() * Math.PI * 2, weight: 1 / (k + 1) ** 1.3
    })).slice(0, state.harmonics);
    const total = terms.reduce((sum, term) => sum + term.weight, 0);
    const points = [];
    for (let s = 0; s <= steps; s++) {
      const x = -pad + s * (width + 2 * pad) / steps;
      const ridge = terms.reduce((sum, t) => sum + t.weight * Math.sin(2 * Math.PI * t.freq * x / width + t.phase), 0);
      points.push({ x, y: base - amp * ridge / total });
    }
    points.push({ x: width + pad, y: height + pad }, { x: -pad, y: height + pad });
    layers.push({
      path: polygonPath(points), tone: (i + 1) / count,
      shadow: { color: '#101a14', opacity: 0.18, blur: minDim * 0.03, x: 0, y: -minDim * 0.008 }
    });
  }
  return layers;
}
