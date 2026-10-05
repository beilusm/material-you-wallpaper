import { calculateBandPolygon, generateWaveParameters } from '../geometry.js';
import { polygonPath } from '../path.js';

export function buildWaveLayers(state, width, height) {
  const params = generateWaveParameters(state.seed);
  const layers = [];
  for (let i = 1; i < state.bandCount; i++) {
    const { polygon, nx, ny, Ln } = calculateBandPolygon({
      index: i, totalBands: state.bandCount, width, height,
      angleDeg: state.angle, curvature: state.curvature, harmonics: state.harmonics,
      waveParam: params[i % params.length], steps: 160
    });
    layers.push({
      path: polygonPath(polygon), colorIndex: i,
      shadow: { color: '#121c16', opacity: 0.16, blur: Ln * 0.02, x: -nx * 7, y: -ny * 7 }
    });
  }
  return layers;
}
