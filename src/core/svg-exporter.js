import { calculateBandPolygon } from './geometry.js';

/**
 * 生成无限分辨率矢量 SVG 字符串
 */
export function generateSVGString(state, width, height) {
  const colors = [state.color2, state.color1];

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `  <title>Material You Minimal Wave Wallpaper</title>\n`;
  svg += `  <!-- Background -->\n`;
  svg += `  <rect width="${width}" height="${height}" fill="${colors[0]}"/>\n`;
  svg += `  <!-- Wave Bands -->\n`;

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

    const fillColor = colors[i % colors.length];
    svg += `  <path d="${pathData}" fill="${fillColor}" />\n`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * 导出并触发浏览器下载 SVG 文件
 */
export function exportToSVGFile(state, width, height, filename) {
  const svgStr = generateSVGString(state, width, height);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `material_you_${width}x${height}_${state.seed}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
