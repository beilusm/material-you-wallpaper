/** Fit the artwork inside the available content box without changing its aspect. */
export function fitPreview({ availableWidth, availableHeight, targetW, targetH, dpr = 1 }) {
  const width = Math.max(1, availableWidth);
  const height = Math.max(1, availableHeight);
  const scale = Math.min(width / targetW, height / targetH);
  const cssWidth = targetW * scale;
  const cssHeight = targetH * scale;
  const pixelRatio = Math.min(Math.max(1, dpr), 3, Math.sqrt(4000000 / (cssWidth * cssHeight)));
  return {
    cssWidth, cssHeight,
    pixelWidth: Math.max(1, Math.round(cssWidth * pixelRatio)),
    pixelHeight: Math.max(1, Math.round(cssHeight * pixelRatio))
  };
}
