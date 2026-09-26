import { calculateBandPolygon, createRNG } from './geometry.js';

/**
 * 生成无限分辨率矢量 SVG 字符串 (支持所有艺术模式)
 */
export function generateSVGString(state, width, height) {
  const colors = [state.color2, state.color1];

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `  <title>Material You Wallpaper - ${state.artMode}</title>\n`;
  svg += `  <rect width="${width}" height="${height}" fill="${colors[0]}"/>\n`;

  if (state.artMode === 'pebbles') {
    const rng = createRNG(state.seed);
    const numPebbles = Math.max(3, state.bandCount + 1);
    const minDim = Math.min(width, height);

    for (let i = 0; i < numPebbles; i++) {
      const cx = width * (0.2 + rng() * 0.6);
      const cy = height * (0.2 + rng() * 0.6);
      const baseR = minDim * (0.18 + rng() * 0.22) * (0.7 + state.curvature * 0.6);
      const numPoints = 8 + Math.floor(rng() * 4);
      const pts = [];
      const rot = rng() * Math.PI * 2;

      for (let j = 0; j < numPoints; j++) {
        const theta = rot + (j * Math.PI * 2) / numPoints;
        const rVar = 1 + (rng() - 0.5) * 0.35 * state.curvature;
        const r = baseR * rVar;
        pts.push({
          x: cx + r * Math.cos(theta),
          y: cy + r * Math.sin(theta)
        });
      }

      let dStr = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} `;
      for (let k = 1; k < pts.length; k++) {
        dStr += `L ${pts[k].x.toFixed(1)},${pts[k].y.toFixed(1)} `;
      }
      dStr += `Z`;

      const fill = colors[i % colors.length];
      svg += `  <path d="${dStr}" fill="${fill}" />\n`;
    }
  } else if (state.artMode === 'topography') {
    const rng = createRNG(state.seed);
    const cx = width * (0.35 + rng() * 0.3);
    const cy = height * (0.35 + rng() * 0.3);
    const maxR = Math.hypot(width, height) * 0.75;
    const layers = Math.max(3, state.bandCount + 2);

    for (let l = layers; l >= 1; l--) {
      const fraction = l / layers;
      const rBase = maxR * fraction;
      const numPoints = 60;
      const pFreq = 2 + state.harmonics;
      const phase = rng() * Math.PI * 2;
      let dStr = '';

      for (let i = 0; i <= numPoints; i++) {
        const theta = (i * Math.PI * 2) / numPoints;
        const offset = (rBase * 0.15 * state.curvature) * Math.sin(theta * pFreq + phase)
                     + (rBase * 0.08 * state.curvature) * Math.cos(theta * 2 - phase);
        const r = Math.max(10, rBase + offset);
        const px = (cx + r * Math.cos(theta)).toFixed(1);
        const py = (cy + r * Math.sin(theta)).toFixed(1);
        dStr += (i === 0 ? `M ${px},${py}` : ` L ${px},${py}`);
      }
      dStr += ` Z`;
      svg += `  <path d="${dStr}" fill="${colors[l % colors.length]}" />\n`;
    }
  } else {
    // 默认波浪模式
    for (let i = 1; i < state.bandCount; i++) {
      const waveParam = state.waveParams[i % state.waveParams.length];
      const { polygon } = calculateBandPolygon({
        index: i,
        totalBands: state.bandCount,
        width,
        height,
        angleDeg: state.angle,
        curvature: state.curvature,
        harmonics: state.harmonics,
        waveParam,
        steps: 160
      });

      let pathData = `M ${polygon[0].x.toFixed(1)},${polygon[0].y.toFixed(1)} `;
      for (let j = 1; j < polygon.length; j++) {
        pathData += `L ${polygon[j].x.toFixed(1)},${polygon[j].y.toFixed(1)} `;
      }
      pathData += `Z`;
      svg += `  <path d="${pathData}" fill="${colors[i % colors.length]}" />\n`;
    }
  }

  svg += `</svg>`;
  return svg;
}

export function exportToSVGFile(state, width, height, filename) {
  const svgStr = generateSVGString(state, width, height);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `material_you_${state.artMode}_${width}x${height}_${state.seed}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
