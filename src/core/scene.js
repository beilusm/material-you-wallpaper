import { buildWaveLayers } from './modes/waves.js';
import { buildPebbleLayers } from './modes/pebbles.js';
import { buildTopographyLayers } from './modes/topography.js';
import { buildArcLayers } from './modes/arcs.js';
import { buildBloomLayers } from './modes/bloom.js';
import { buildHillLayers } from './modes/hills.js';
import { bandGradientCoordinates } from './effects.js';
import { mixHex } from './color.js';
import { validateDimensions, validateArtworkParameters } from './validation.js';

export { validateDimensions } from './validation.js';

const builders = {
  waves: buildWaveLayers, pebbles: buildPebbleLayers, topography: buildTopographyLayers,
  arcs: buildArcLayers, bloom: buildBloomLayers, hills: buildHillLayers
};

export function validateRenderState(state) {
  validateArtworkParameters(state);
}

export function createWallpaperScene(state, width, height) {
  validateDimensions(width, height);
  validateRenderState(state);
  const colors = [state.color2, state.color1];
  const gradient = (colorA, colorB, angle = state.angle) => ({
    ...bandGradientCoordinates(angle, width, height), colorA, colorB
  });
  // Waves alternate the two colors; layered modes step from color2 (tone 0) to color1 (tone 1).
  const indexFill = (index, angle) => state.useGradient
    ? gradient(colors[index % 2], colors[(index + 1) % 2], angle) : colors[index % 2];
  const toneFill = tone => {
    const at = t => mixHex(state.color2, state.color1, Math.min(1, Math.max(0, t)));
    return state.useGradient ? gradient(at(tone - 0.18), at(tone + 0.18)) : at(tone);
  };
  const layerFill = layer => layer.tone === undefined ? indexFill(layer.colorIndex) : toneFill(layer.tone);
  return {
    width, height,
    background: state.artMode === 'waves' ? indexFill(0, state.angle + 90) : colors[0],
    layers: builders[state.artMode](state, width, height).map(layer => ({
      path: layer.path, fill: layerFill(layer), shadow: state.hasShadow ? layer.shadow : null
    })),
    grain: state.grain, seed: state.seed
  };
}
