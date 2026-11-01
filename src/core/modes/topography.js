import { createRNG, createRadialProfile } from '../geometry.js';
import { closedSplinePath } from '../path.js';

/**
 * Paper-cut contours share one outline that twists and drifts slightly per level.
 * Twist, drift and amplitude are bounded so each level stays inside the one below it.
 */
export function buildTopographyLayers(state, width, height) {
  const rng = createRNG(state.seed);
  const cx = width * (0.3 + rng() * 0.4);
  const cy = height * (0.3 + rng() * 0.4);
  const count = Math.max(3, state.bandCount + 2);
  const step = Math.hypot(width, height) * 0.62 / count;
  const profile = createRadialProfile(rng, [2 + state.harmonics, 2, 1]);
  const amplitude = 0.04 + state.curvature * 0.2;
  const twist = 0.5 / count;
  const drift = rng() * Math.PI * 2;
  const layers = [];
  for (let l = count; l >= 1; l--) {
    const rBase = step * l;
    const shift = step * 0.1 * (count - l);
    const ox = cx + Math.cos(drift) * shift, oy = cy + Math.sin(drift) * shift;
    const points = Array.from({ length: 72 }, (_, i) => {
      const theta = i * Math.PI * 2 / 72;
      const r = rBase * (1 + amplitude * profile(theta + twist * l));
      return { x: ox + r * Math.cos(theta), y: oy + r * Math.sin(theta) };
    });
    layers.push({
      path: closedSplinePath(points), tone: (count - l + 1) / count,
      shadow: { color: '#101a14', opacity: 0.15, blur: Math.min(width, height) * 0.025, x: 0, y: 4 }
    });
  }
  return layers;
}
