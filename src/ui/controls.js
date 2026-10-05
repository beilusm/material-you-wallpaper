import { RESOLUTION_PRESETS } from '../constants/presets.js';
import { HistoryManager } from '../core/history.js';
import { snapshotWallpaper } from '../core/state.js';
import { validateDimensions, MAX_SEED } from '../core/validation.js';
import { createShareURL, wallpaperFromHash, browserStorage, saveSession } from '../core/session.js';
import { applyMaterialTheme } from '../core/monet.js';
import { showToast } from './toast.js';
import { setupExportControls } from './exports.js';
import { setupPanelControls } from './panel.js';
import { setupColorControls } from './colors.js';
import { setupKeyboardShortcuts } from './shortcuts.js';

export function setupControls(state, onStateChange, mockupManager) {
  const history = new HistoryManager(25);
  history.push(state);
  const exportControls = setupExportControls(state);
  const { downloadPNG, copyClipboard } = exportControls;

  // 1. 初始化并联动 Jetpack Compose 动态主题 (DynamicColorScheme)
  function syncTheme() {
    applyMaterialTheme(state.color1, state.isDark);
  }
  syncTheme();

  // 2. 艺术形态模式切换 (Compose SegmentedButton)
  const modeTabs = document.querySelectorAll('.m3-segmented-btn');
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.artMode = tab.dataset.mode;
      syncModeSelection();
      commitStateChange();
      const label = tab.querySelector('span:not(.material-symbols-rounded)')?.textContent.trim() || tab.textContent.trim();
      const icon = tab.querySelector('.material-symbols-rounded')?.textContent.trim() || 'category';
      showToast(`艺术形态：${label}`, 1200, icon);
    });
  });

  const colorControls = setupColorControls(state, {
    onChange: pushHistory => { syncTheme(); commitStateChange(false, pushHistory); }
  });

  // 深浅主题切换 (Material Symbols Rounded 图标切换)
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.textContent = state.isDark ? 'dark_mode' : 'light_mode';
  }
  themeToggleBtn.addEventListener('click', () => {
    state.isDark = !state.isDark;
    if (themeIcon) {
      themeIcon.textContent = state.isDark ? 'dark_mode' : 'light_mode';
    }
    syncTheme();
    saveSession(state, browserStorage());
    showToast(state.isDark ? '已切换至深色模式' : '已切换至浅色模式', 1200, state.isDark ? 'dark_mode' : 'light_mode');
  });

  // 5. 滑块控制 (Compose Sliders)
  const bandSlider = document.getElementById('bandCountSlider');
  const angleSlider = document.getElementById('angleSlider');
  const curvSlider = document.getElementById('curvSlider');
  const freqSlider = document.getElementById('freqSlider');
  const grainSlider = document.getElementById('grainSlider');

  bandSlider.addEventListener('input', (e) => {
    state.bandCount = parseInt(e.target.value, 10);
    syncModeControls();
    commitStateChange(false, false);
  });
  bandSlider.addEventListener('change', () => commitStateChange());

  angleSlider.value = state.angle;
  document.getElementById('angleVal').textContent = `${state.angle}°`;
  angleSlider.addEventListener('input', (e) => {
    state.angle = parseInt(e.target.value, 10);
    document.getElementById('angleVal').textContent = `${state.angle}°`;
    commitStateChange(false, false);
  });
  angleSlider.addEventListener('change', () => commitStateChange());

  curvSlider.addEventListener('input', (e) => {
    state.curvature = parseInt(e.target.value, 10) / 100;
    document.getElementById('curvVal').textContent = `${e.target.value}%`;
    commitStateChange(false, false);
  });
  curvSlider.addEventListener('change', () => commitStateChange());

  const freqLabels = ['简约单峰 (1x)', '双重流线 (2x)', '自然水波 (3x)'];
  freqSlider.addEventListener('input', (e) => {
    state.harmonics = parseInt(e.target.value, 10);
    syncModeControls();
    commitStateChange(false, false);
  });
  freqSlider.addEventListener('change', () => commitStateChange());

  grainSlider.addEventListener('input', (e) => {
    state.grain = parseInt(e.target.value, 10) / 100;
    document.getElementById('grainVal').textContent = `${e.target.value}%`;
    commitStateChange(false, false);
  });
  grainSlider.addEventListener('change', () => commitStateChange());

  document.getElementById('shadowToggle').addEventListener('change', (e) => {
    state.hasShadow = e.target.checked;
    commitStateChange();
  });

  document.getElementById('gradientToggle').addEventListener('change', (e) => {
    state.useGradient = e.target.checked;
    commitStateChange();
  });

  // 6. 分辨率预设渲染 (Compose Tonal Cards)
  const resGrid = document.getElementById('resGrid');
  function refreshResGrid() {
    resGrid.innerHTML = '';
    RESOLUTION_PRESETS.forEach((res) => {
      const btn = document.createElement('button');
      const isThisActive = (state.targetW === res.w && state.targetH === res.h);
      btn.className = `m3-res-card ${isThisActive ? 'active' : ''}`;
      btn.setAttribute('aria-pressed', String(isThisActive));
      btn.dataset.w = res.w;
      btn.dataset.h = res.h;
      btn.innerHTML = `
        <div class="name">${res.name} <span class="badge">${res.badge}</span></div>
        <div class="dim">${res.w} × ${res.h}</div>
      `;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.m3-res-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.targetW = res.w;
        state.targetH = res.h;
        syncResolutionSelection();
        updateMobileRatioLabel();
        commitStateChange(true);
      });
      resGrid.appendChild(btn);
    });
  }
  refreshResGrid();

  const outputWidthInput = document.getElementById('outputWidthInput');
  const outputHeightInput = document.getElementById('outputHeightInput');
  function syncOutputFields() {
    outputWidthInput.value = state.targetW;
    outputHeightInput.value = state.targetH;
    document.getElementById('outputSizeHint').textContent = `${state.targetW} × ${state.targetH} · ${(state.targetW * state.targetH / 1000000).toFixed(1)} MP`;
  }
  function applyOutputDimensions() {
    const width = Number(outputWidthInput.value), height = Number(outputHeightInput.value);
    try {
      validateDimensions(width, height);
      state.targetW = width; state.targetH = height;
      refreshResGrid(); updateMobileRatioLabel();
      commitStateChange(true);
    } catch (error) { showToast(error.message, 3500, 'error'); }
  }
  document.getElementById('customResolutionForm').addEventListener('submit', e => {
    e.preventDefault(); applyOutputDimensions();
  });
  document.getElementById('swapDimensionsBtn').addEventListener('click', () => {
    const width = outputWidthInput.value;
    outputWidthInput.value = outputHeightInput.value;
    outputHeightInput.value = width;
    applyOutputDimensions();
  });
  document.getElementById('seedForm').addEventListener('submit', e => {
    e.preventDefault();
    const seed = Number(document.getElementById('seedInput').value);
    if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
      showToast(`种子必须为 0 至 ${MAX_SEED} 的整数`, 2500, 'error'); return;
    }
    state.seed = seed;
    commitStateChange();
  });

  // 移动端快速比例切换 (手机竖屏 9:20 与 电脑横屏 3:2 互切)
  const mobileRatioBtn = document.getElementById('mobileRatioBtn');
  const mobileRatioLabel = document.getElementById('mobileRatioLabel');

  function updateMobileRatioLabel() {
    if (!mobileRatioLabel) return;
    const isPortrait = state.targetH > state.targetW;
    mobileRatioLabel.textContent = isPortrait ? '竖屏' : '横屏';
  }
  updateMobileRatioLabel();

  if (mobileRatioBtn) {
    mobileRatioBtn.addEventListener('click', () => {
      const isCurrentlyPortrait = state.targetH > state.targetW;
      if (isCurrentlyPortrait) {
        // 切为横屏 2736×1824
        state.targetW = 2736;
        state.targetH = 1824;
        state.angle = -35;
        showToast('已切换为电脑横屏 (3:2)', 1200, 'laptop');
      } else {
        // 切为竖屏 1080×2400
        state.targetW = 1080;
        state.targetH = 2400;
        state.angle = -55;
        showToast('已切换为手机竖屏 (9:20)', 1200, 'smartphone');
      }
      angleSlider.value = state.angle;
      document.getElementById('angleVal').textContent = `${state.angle}°`;
      updateMobileRatioLabel();
      refreshResGrid();
      commitStateChange(true);
    });
  }

  // 7. 随机造型生成
  function randomize() {
    state.seed = Math.floor(Math.random() * 1000000);
    document.getElementById('seedInput').value = state.seed;
    const isPortrait = state.targetH > state.targetW;
    const baseAngle = isPortrait ? -55 : -35;
    state.angle = baseAngle + Math.floor(Math.random() * 16 - 8);
    angleSlider.value = state.angle;
    document.getElementById('angleVal').textContent = `${state.angle}°`;
    commitStateChange();
    showToast('已生成全新造型', 1000, 'casino');
  }

  document.getElementById('randomBtn').addEventListener('click', randomize);
  document.getElementById('quickRandomBtn').addEventListener('click', randomize);

  // 8. 撤销 / 重做
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  function updateUndoRedoUI() {
    if (undoBtn) undoBtn.disabled = !history.canUndo();
    if (redoBtn) redoBtn.disabled = !history.canRedo();
  }

  function applySnapshot(snap) {
    colorControls.cancelExtraction(true);
    Object.assign(state, snap);

    syncModeSelection();
    colorControls.sync();
    bandSlider.value = state.bandCount;
    syncModeControls();
    angleSlider.value = state.angle;
    document.getElementById('angleVal').textContent = `${state.angle}°`;
    curvSlider.value = Math.round(state.curvature * 100);
    document.getElementById('curvVal').textContent = `${curvSlider.value}%`;
    freqSlider.value = state.harmonics;
    syncModeControls();
    grainSlider.value = Math.round(state.grain * 100);
    document.getElementById('grainVal').textContent = `${grainSlider.value}%`;
    document.getElementById('shadowToggle').checked = state.hasShadow;
    document.getElementById('gradientToggle').checked = state.useGradient;

    updateMobileRatioLabel();
    refreshResGrid();
    syncOutputFields();
    document.getElementById('seedInput').value = state.seed;
    colorControls.sync();
    syncTheme();
    onStateChange(true);
    updateUndoRedoUI();
  }

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      const snap = history.undo();
      if (snap) {
        applySnapshot(snap);
        showToast('已撤销', 1000, 'undo');
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      const snap = history.redo();
      if (snap) {
        applySnapshot(snap);
        showToast('已重做', 1000, 'redo');
      }
    });
  }

  function syncModeControls() {
    const mode = state.artMode;
    const labels = { waves: '条带数量', pebbles: '圆石数量', topography: '等高线层数' };
    document.getElementById('bandCountLabel').textContent = labels[mode];
    document.getElementById('bandCountVal').textContent = state.bandCount + (mode === 'pebbles' ? 1 : mode === 'topography' ? 2 : 0);
    document.getElementById('freqControl').hidden = mode === 'pebbles';
    document.getElementById('freqVal').textContent = mode === 'topography'
      ? ['三重起伏', '四重起伏', '五重起伏'][state.harmonics - 1] : freqLabels[state.harmonics - 1];
    document.getElementById('angleLabel').textContent = mode === 'waves' ? '流线倾斜角度' : '渐变方向';
    angleSlider.disabled = mode !== 'waves' && !state.useGradient;
    angleSlider.closest('.m3-slider-item').classList.toggle('control-disabled', angleSlider.disabled);
  }

  function syncModeSelection() {
    modeTabs.forEach(tab => {
      const active = tab.dataset.mode === state.artMode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
  }

  function syncResolutionSelection() {
    resGrid.querySelectorAll('.m3-res-card').forEach(btn => {
      const active = Number(btn.dataset.w) === state.targetW && Number(btn.dataset.h) === state.targetH;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function commitStateChange(needsLayoutResize = false, pushHistory = true) {
    colorControls.sync();
    syncModeControls();
    if (needsLayoutResize) syncOutputFields();
    if (pushHistory) {
      history.push(state);
      updateUndoRedoUI();
    }
    onStateChange(needsLayoutResize);
  }

  const { toggleSheet } = setupPanelControls({
    onStateChange, onModalChange: exportControls.setModalContainer
  });
  document.getElementById('mobileRandomBtn').addEventListener('click', randomize);
  document.getElementById('mobilePaletteBtn').addEventListener('click', colorControls.randomize);

  // 11. 桌面挂件透视 (Mockup) 状态联动
  const mockupBtn = document.getElementById('toggleMockupBtn');
  const panelMockupBtn = document.getElementById('panelMockupBtn');

  function toggleMockup() {
    const isActive = mockupManager.toggle();
    [mockupBtn, panelMockupBtn].filter(Boolean).forEach(btn => {
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    showToast(isActive ? '已开启桌面预览' : '已关闭桌面预览', 1000, 'devices');
  }

  [mockupBtn, panelMockupBtn].filter(Boolean).forEach(btn => btn.setAttribute('aria-pressed', 'false'));
  if (mockupBtn) mockupBtn.addEventListener('click', toggleMockup);
  if (panelMockupBtn) panelMockupBtn.addEventListener('click', toggleMockup);

  setupKeyboardShortcuts({
    undo: () => undoBtn?.click(), redo: () => redoBtn?.click(),
    downloadPNG, copyClipboard, randomize, togglePanel: toggleSheet, toggleMockup
  });

  colorControls.sync();
  // Restore every control from the same artwork state used by the renderer.
  applySnapshot(snapshotWallpaper(state));

  document.getElementById('shareBtn').addEventListener('click', async () => {
    const url = createShareURL(state, location.href);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url);
      showToast('作品链接已复制，可直接分享', 2200, 'link');
    } catch {
      const dialog = document.getElementById('shareDialog');
      const input = document.getElementById('shareUrlInput');
      input.value = url;
      dialog.showModal();
      input.focus(); input.select();
    }
  });
  document.getElementById('closeShareDialogBtn').addEventListener('click', () => document.getElementById('shareDialog').close());

  window.addEventListener('hashchange', () => {
    try {
      const snapshot = wallpaperFromHash(location.hash);
      if (!snapshot) return;
      history.push(snapshot);
      applySnapshot(snapshot);
      showToast('已载入分享作品', 2000, 'link');
    } catch (error) { showToast(error.message, 3500, 'error'); }
  });
}
