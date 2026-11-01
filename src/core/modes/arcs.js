import { createRNG } from '../geometry.js';
import { circlePath } from '../path.js';

/** Sun rings rise from below the bottom edge; each ring's drift stays inside the ring behind it. */
export function buildArcLayers(state, width, height) {
  const rng = createRNG(state.seed);
  const minDim = Math.min(width, height);
  const count = state.bandCount + 1;
  const cx = width * (0.2 + rng() * 0.6);
  const cy = height * (1 + rng() * 0.06);
  const outer = Math.hypot(Math.max(cx, width - cx), cy) * 0.92;
  const ratio = (0.42 - state.curvature * 0.3) ** (1 / (count - 1));
  const lean = (rng() - 0.5) * 0.5;
  const layers = [];
  for (let i = 0; i < count; i++) {
    const r = outer * ratio ** i;
    layers.push({
      path: circlePath(cx + (outer - r) * lean, cy, r), tone: (i + 1) / count,
      shadow: { color: '#101a14', opacity: 0.16, blur: minDim * 0.03, x: 0, y: -minDim * 0.006 }
    });
  }
  return layers;
}
