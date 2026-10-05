import './styles/main.css';
import './styles/components.css';
import { setupControls } from './ui/controls.js';
import { renderWallpaper } from './core/renderer.js';
import { setupMockupOverlay } from './ui/mockup.js';
import { fitPreview } from './core/layout.js';
import { createDefaultState } from './core/state.js';
import { browserStorage, restoreSession, saveSession } from './core/session.js';
import { showToast } from './ui/toast.js';
import { isMobileLayout } from './ui/layout.js';

// 解决移动端浏览器（Chrome/Safari）底栏遮挡的关键：动态计算实际视口高度
function syncAppHeight() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
}
syncAppHeight();

const isPortraitInitial = isMobileLayout();

const storage = browserStorage();
const restored = restoreSession(createDefaultState(isPortraitInitial), storage, location.hash);
const state = restored.state;
let saveTimer;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveSession(state, storage), 250);
}
window.addEventListener('pagehide', () => {
  clearTimeout(saveTimer);
  saveSession(state, storage);
});

const canvas = document.getElementById('wallpaperCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('canvasWrapper');
const viewport = document.getElementById('viewport');

// 桌面/手机挂件透视覆盖层
const mockupManager = setupMockupOverlay(wrapper);

/**
 * 根据容器比例与目标分辨率自适应计算居中预览画布
 */
function updateCanvasLayout() {
  const style = getComputedStyle(viewport);
  const availableWidth = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const availableHeight = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const { cssWidth, cssHeight, pixelWidth, pixelHeight } = fitPreview({
    availableWidth, availableHeight, targetW: state.targetW, targetH: state.targetH,
    dpr: window.devicePixelRatio || 1
  });
  wrapper.style.width = `${cssWidth}px`;
  wrapper.style.height = `${cssHeight}px`;
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
}

/**
 * 渲染预览帧
 */
function draw() {
  ctx.save();
  try {
    ctx.scale(canvas.width / state.targetW, canvas.height / state.targetH);
    renderWallpaper(ctx, state, state.targetW, state.targetH);
  } finally {
    ctx.restore();
  }
}

/**
 * 状态变化响应
 */
let frame = null;
let needsLayout = false;
function handleStateChange(needsLayoutResize = false) {
  needsLayout ||= needsLayoutResize;
  if (frame !== null) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    if (needsLayout) {
      updateCanvasLayout();
      needsLayout = false;
    }
    draw();
    scheduleSave();
  });
}

setupControls(state, handleStateChange, mockupManager);
updateCanvasLayout();
draw();
if (restored.error) showToast(restored.error, 3500, 'error');
else if (restored.source === 'shared') showToast('已载入分享作品', 2000, 'link');

function resizePreview() {
  syncAppHeight();
  handleStateChange(true);
}
window.addEventListener('resize', resizePreview);
window.visualViewport?.addEventListener('resize', resizePreview);
new ResizeObserver(() => handleStateChange(true)).observe(viewport);
window.addEventListener('orientationchange', resizePreview);
