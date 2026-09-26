import './styles/main.css';
import { setupControls } from './ui/controls.js';
import { renderWallpaper } from './core/renderer.js';
import { setupMockupOverlay } from './ui/mockup.js';

// 解决移动端浏览器（Chrome/Safari）底栏遮挡的关键：动态计算实际视口高度
function syncAppHeight() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
}
syncAppHeight();
window.addEventListener('resize', syncAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncAppHeight);
}

// 屏幕规格自适应检测
function checkIsPortrait() {
  return window.innerWidth <= 768 || window.innerHeight > window.innerWidth;
}
const isPortraitInitial = checkIsPortrait();

// 应用根状态 (Jetpack Compose Material 3 驱动)
const state = {
  artMode: 'waves', // 'waves' | 'pebbles' | 'topography'
  isDark: true,     // Material 3 深浅主题切换
  // 手机端优先竖屏黄金比例 1080×2400，桌面端优先 2736×1824 (3:2)
  targetW: isPortraitInitial ? 1080 : 2736,
  targetH: isPortraitInitial ? 2400 : 1824,
  color1: '#b2ccc1',
  color2: '#e7f2ed',
  bandCount: 4,
  angle: isPortraitInitial ? -55 : -35,
  curvature: 0.42,
  harmonics: 1,
  hasShadow: false,
  useGradient: false,
  grain: 0.0,
  seed: 42,
  waveParams: []
};

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
  const isPortrait = checkIsPortrait();
  // 移动端为底部导航栏与边距预留足量呼吸空间
  const padX = isPortrait ? 24 : 48;
  const padY = isPortrait ? 116 : 48;

  const maxW = Math.max(100, viewport.clientWidth - padX);
  const maxH = Math.max(100, viewport.clientHeight - padY);
  const aspect = state.targetW / state.targetH;

  let renderW, renderH;
  if (maxW / maxH > aspect) {
    renderH = maxH;
    renderW = maxH * aspect;
  } else {
    renderW = maxW;
    renderH = maxW / aspect;
  }

  wrapper.style.width = `${Math.round(renderW)}px`;
  wrapper.style.height = `${Math.round(renderH)}px`;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(renderW * dpr);
  canvas.height = Math.round(renderH * dpr);
}

/**
 * 渲染预览帧
 */
function draw() {
  ctx.save();
  ctx.scale(canvas.width / state.targetW, canvas.height / state.targetH);
  renderWallpaper(ctx, state, state.targetW, state.targetH);
  ctx.restore();
}

/**
 * 状态变化响应
 */
function handleStateChange(needsLayoutResize = false) {
  if (needsLayoutResize) {
    updateCanvasLayout();
  }
  draw();
}

// 初始化
setupControls(state, handleStateChange, mockupManager);
updateCanvasLayout();
draw();

window.addEventListener('resize', () => {
  syncAppHeight();
  updateCanvasLayout();
  draw();
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    syncAppHeight();
    updateCanvasLayout();
    draw();
  }, 200);
});
