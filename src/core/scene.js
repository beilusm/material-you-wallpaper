import { buildWaveLayers } from './modes/waves.js';
import { buildPebbleLayers } from './modes/pebbles.js';
import { buildTopographyLayers } from './modes/topography.js';
import { bandGradientCoordinates } from './effects.js';
import { validateDimensions, validateArtworkParameters } from './validation.js';

export { validateDimensions } from './validation.js';

export function validateRenderState(state) {
  validateArtworkParameters(state);
}

export function createWallpaperScene(state, width, height) {
  validateDimensions(width, height);
  validateRenderState(state);
  const colors = [state.color2, state.color1];
  const fill = (index, angle = state.angle) => state.useGradient ? {
    ...bandGradientCoordinates(angle, width, height),
    colorA: colors[index % 2], colorB: colors[(index + 1) % 2]
  } : colors[index % 2];
  const builders = { waves: buildWaveLayers, pebbles: buildPebbleLayers, topography: buildTopographyLayers };
  return {
    width, height,
    background: state.artMode === 'waves' ? fill(0, state.angle + 90) : colors[0],
    layers: builders[state.artMode](state, width, height).map(layer => ({
      path: layer.path, fill: fill(layer.colorIndex), shadow: state.hasShadow ? layer.shadow : null
    })),
    grain: state.grain, seed: state.seed
  };
}
