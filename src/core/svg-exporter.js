import { createWallpaperScene } from './scene.js';
import { pathToSVG } from './path.js';
import { getNoiseTile, NOISE_TILE_SIZE } from './effects.js';
import { downloadBlob } from './download.js';

export function generateSVGString(state, width, height) {
  const scene = createWallpaperScene(state, width, height);
  const defs = [];
  const elements = [];
  const format = n => Number(n.toFixed(4));
  function fillAttribute(fill, id) {
    if (typeof fill === 'string') return fill;
    defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${format(fill.x1)}" y1="${format(fill.y1)}" x2="${format(fill.x2)}" y2="${format(fill.y2)}"><stop offset="0" stop-color="${fill.colorA}"/><stop offset="1" stop-color="${fill.colorB}"/></linearGradient>`);
    return `url(#${id})`;
  }
  elements.push(`<rect width="${width}" height="${height}" fill="${fillAttribute(scene.background, 'background')}"/>`);
  scene.layers.forEach((layer, index) => {
    let filter = '';
    if (layer.shadow) {
      const { color, opacity, blur, x, y } = layer.shadow;
      const margin = Math.ceil(blur * 3 + Math.max(Math.abs(x), Math.abs(y)));
      defs.push(`<filter id="shadow-${index}" filterUnits="userSpaceOnUse" x="${-margin}" y="${-margin}" width="${width + margin * 2}" height="${height + margin * 2}" color-interpolation-filters="sRGB"><feDropShadow dx="${format(x)}" dy="${format(y)}" stdDeviation="${format(blur / 2)}" flood-color="${color}" flood-opacity="${opacity}"/></filter>`);
      filter = ` filter="url(#shadow-${index})"`;
    }
    elements.push(`<path d="${pathToSVG(layer.path)}" fill="${fillAttribute(layer.fill, `gradient-${index}`)}"${filter}/>`);
  });
  if (scene.grain > 0.005) {
    // Only the optional grain is a bitmap; all wallpaper shapes remain vector paths.
    const tile = getNoiseTile(scene.seed).toDataURL('image/png');
    defs.push(`<pattern id="grain" patternUnits="userSpaceOnUse" width="${NOISE_TILE_SIZE}" height="${NOISE_TILE_SIZE}"><image href="${tile}" width="${NOISE_TILE_SIZE}" height="${NOISE_TILE_SIZE}"/></pattern>`);
    elements.push(`<rect width="${width}" height="${height}" fill="url(#grain)" opacity="${scene.grain}" style="mix-blend-mode:overlay"/>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<title>Material You Wallpaper - ${state.artMode}</title>\n<defs>${defs.join('\n')}</defs>\n<g style="isolation:isolate">${elements.join('\n')}</g>\n</svg>`;
}

export function exportToSVGFile(state, width, height, filename) {
  const svg = generateSVGString(state, width, height);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    filename || `material_you_${state.artMode}_${width}x${height}_${state.seed}.svg`);
}
