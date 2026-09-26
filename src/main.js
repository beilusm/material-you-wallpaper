import './styles/main.css';
import { setupControls } from './ui/controls.js';
import { renderWallpaper } from './core/renderer.js';
import { setupMockupOverlay } from './ui/mockup.js';

// 应用根状态 (Jetpack Compose Material 3 驱动)
const state = {
  artMode: 'waves', // 'waves' | 'pebbles' | 'topography'
  isDark: true,     // Material 3 深浅主题切换
  targetW: 2736,
  targetH: 1824,
  color1: '#b2ccc1',
  color2: '#e7f2ed',
  bandCount: 4,
  angle: -35,
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

// 桌面挂件透视覆盖层
const mockupManager = setupMockupOverlay(wrapper);

/**
 * 根据容器比例与目标分辨率适配预览画布
 */
function updateCanvasLayout() {
  const maxW = viewport.clientWidth - 48;
  const maxH = viewport.clientHeight - 48;
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
  updateCanvasLayout();
  draw();
});
