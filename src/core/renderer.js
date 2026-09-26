import { renderWaves } from './modes/waves.js';
import { renderPebbles } from './modes/pebbles.js';
import { renderTopography } from './modes/topography.js';
import { applyFilmGrain } from './effects.js';

/**
 * 核心调度渲染管线
 */
export function renderWallpaper(ctx, state, width, height) {
  // 1. 根据当前艺术模式调度对应的绘制引擎
  switch (state.artMode) {
    case 'pebbles':
      renderPebbles(ctx, state, width, height);
      break;
    case 'topography':
      renderTopography(ctx, state, width, height);
      break;
    case 'waves':
    default:
      renderWaves(ctx, state, width, height);
      break;
  }

  // 2. 叠加热力胶片颗粒噪点特效 (Film Grain)
  if (state.grain > 0) {
    applyFilmGrain(ctx, width, height, state.grain);
  }
}

/**
 * 离线导出高精度 PNG Blob
 */
export function exportToPNGBlob(state, width, height) {
  return new Promise((resolve) => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportCtx = exportCanvas.getContext('2d');

    renderWallpaper(exportCtx, state, width, height);

    exportCanvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * 复制生成的超清图片直接到系统剪贴板 (免去保存与查找步骤)
 */
export async function copyImageToClipboard(state, width, height) {
  const blob = await exportToPNGBlob(state, width, height);
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error('当前浏览器不支持直接复制图片到剪贴板');
  }
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]);
}
