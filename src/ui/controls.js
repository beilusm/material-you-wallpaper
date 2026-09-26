import { PALETTES, generateRandomHarmoniousPalette } from '../constants/palettes.js';
import { RESOLUTION_PRESETS } from '../constants/presets.js';
import { generateWaveParameters } from '../core/geometry.js';
import { exportToPNGBlob, copyImageToClipboard } from '../core/renderer.js';
import { exportToSVGFile } from '../core/svg-exporter.js';
import { extractPaletteFromImage } from '../core/extractor.js';
import { HistoryManager } from '../core/history.js';
import { applyMaterialTheme } from '../core/monet.js';
import { showToast } from './toast.js';

export function setupControls(state, onStateChange, mockupManager) {
  const history = new HistoryManager(25);
  history.push(state);

  // 初始化波浪随机参数
  state.waveParams = generateWaveParameters(state.seed);

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
      commitStateChange();
      showToast(`切换至形态：${tab.textContent.trim()}`, 1200);
    });
  });

  // 3. 调色板预设渲染 (Compose FilterChips)
  const paletteGrid = document.getElementById('paletteGrid');
  paletteGrid.innerHTML = '';

  PALETTES.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.className = `m3-filter-chip ${idx === 0 ? 'active' : ''}`;
    btn.dataset.id = p.id;
    btn.innerHTML = `
      <div class="color-swatches">
        <div class="swatch" style="background: ${p.c1}"></div>
        <div class="swatch" style="background: ${p.c2}"></div>
      </div>
      <span>${p.name}</span>
    `;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.m3-filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.color1 = p.c1;
      state.color2 = p.c2;
      document.getElementById('color1Input').value = p.c1;
      document.getElementById('color2Input').value = p.c2;
      syncTheme();
      commitStateChange();
    });
    paletteGrid.appendChild(btn);
  });

  // 4. 自定义拾色器
  const c1Input = document.getElementById('color1Input');
  const c2Input = document.getElementById('color2Input');

  c1Input.addEventListener('input', (e) => {
    state.color1 = e.target.value;
    document.querySelectorAll('.m3-filter-chip').forEach(b => b.classList.remove('active'));
    syncTheme();
    commitStateChange(false, false);
  });
  c1Input.addEventListener('change', () => commitStateChange());

  c2Input.addEventListener('input', (e) => {
    state.color2 = e.target.value;
    document.querySelectorAll('.m3-filter-chip').forEach(b => b.classList.remove('active'));
    commitStateChange(false, false);
  });
  c2Input.addEventListener('change', () => commitStateChange());

  document.getElementById('swapColorsBtn').addEventListener('click', () => {
    const temp = state.color1;
    state.color1 = state.color2;
    state.color2 = temp;
    c1Input.value = state.color1;
    c2Input.value = state.color2;
    syncTheme();
    commitStateChange();
  });

  // 随机灵感配色
  document.getElementById('randomPaletteBtn').addEventListener('click', () => {
    const pair = generateRandomHarmoniousPalette();
    state.color1 = pair.c1;
    state.color2 = pair.c2;
    c1Input.value = pair.c1;
    c2Input.value = pair.c2;
    document.querySelectorAll('.m3-filter-chip').forEach(b => b.classList.remove('active'));
    syncTheme();
    commitStateChange();
    showToast('🎨 已生成一组动态 Monet 配色！', 1500);
  });

  // 智能图片取色
  const imgFileInput = document.getElementById('imgFileInput');
  document.getElementById('extractFromImgBtn').addEventListener('click', () => {
    imgFileInput.click();
  });
  imgFileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('正在分析图片提取 Monet 色阶...');
      const pair = await extractPaletteFromImage(file);
      state.color1 = pair.c1;
      state.color2 = pair.c2;
      c1Input.value = pair.c1;
      c2Input.value = pair.c2;
      document.querySelectorAll('.m3-filter-chip').forEach(b => b.classList.remove('active'));
      syncTheme();
      commitStateChange();
      showToast('✓ 成功提取图片配色并同步全局主题！');
    } catch {
      showToast('图片分析失败，请换一张试一下');
    }
    imgFileInput.value = '';
  });

  // 深浅主题切换
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleBtn.addEventListener('click', () => {
    state.isDark = !state.isDark;
    themeToggleBtn.textContent = state.isDark ? '☀️' : '🌙';
    syncTheme();
    showToast(state.isDark ? '已切换至深色 Material 模式' : '已切换至浅色 Material 模式', 1200);
  });

  // 5. 滑块控制 (Compose Sliders)
  const bandSlider = document.getElementById('bandCountSlider');
  const angleSlider = document.getElementById('angleSlider');
  const curvSlider = document.getElementById('curvSlider');
  const freqSlider = document.getElementById('freqSlider');
  const grainSlider = document.getElementById('grainSlider');

  bandSlider.addEventListener('input', (e) => {
    state.bandCount = parseInt(e.target.value, 10);
    document.getElementById('bandCountVal').textContent = state.bandCount;
    commitStateChange(false, false);
  });
  bandSlider.addEventListener('change', () => commitStateChange());

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
    document.getElementById('freqVal').textContent = freqLabels[state.harmonics - 1];
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
  resGrid.innerHTML = '';

  RESOLUTION_PRESETS.forEach((res) => {
    const btn = document.createElement('button');
    btn.className = `m3-res-card ${res.isDefault ? 'active' : ''}`;
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
      commitStateChange(true);
    });
    resGrid.appendChild(btn);
  });

  // 7. 随机造型生成
  function randomize() {
    state.seed = Math.floor(Math.random() * 1000000);
    state.angle = -35 + Math.floor(Math.random() * 16 - 8);
    angleSlider.value = state.angle;
    document.getElementById('angleVal').textContent = `${state.angle}°`;
    state.waveParams = generateWaveParameters(state.seed);
    commitStateChange();
    showToast('🎲 换了一个新造型！', 1200);
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
    Object.assign(state, snap);
    state.waveParams = generateWaveParameters(state.seed);

    modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === state.artMode));
    c1Input.value = state.color1;
    c2Input.value = state.color2;
    bandSlider.value = state.bandCount;
    document.getElementById('bandCountVal').textContent = state.bandCount;
    angleSlider.value = state.angle;
    document.getElementById('angleVal').textContent = `${state.angle}°`;
    curvSlider.value = Math.round(state.curvature * 100);
    document.getElementById('curvVal').textContent = `${curvSlider.value}%`;
    freqSlider.value = state.harmonics;
    document.getElementById('freqVal').textContent = freqLabels[state.harmonics - 1];
    grainSlider.value = Math.round(state.grain * 100);
    document.getElementById('grainVal').textContent = `${grainSlider.value}%`;
    document.getElementById('shadowToggle').checked = state.hasShadow;
    document.getElementById('gradientToggle').checked = state.useGradient;

    syncTheme();
    onStateChange(true);
    updateUndoRedoUI();
  }

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      const snap = history.undo();
      if (snap) {
        applySnapshot(snap);
        showToast('↶ 已撤销');
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      const snap = history.redo();
      if (snap) {
        applySnapshot(snap);
        showToast('↷ 已重做');
      }
    });
  }

  function commitStateChange(needsLayoutResize = false, pushHistory = true) {
    if (pushHistory) {
      history.push(state);
      updateUndoRedoUI();
    }
    onStateChange(needsLayoutResize);
  }

  // 9. 面板折叠
  const panel = document.getElementById('panel');
  document.getElementById('togglePanelBtn').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });
  document.getElementById('closePanelBtn').addEventListener('click', () => {
    panel.classList.add('collapsed');
  });

  // 10. 桌面挂件透视 (Mockup)
  const mockupBtn = document.getElementById('toggleMockupBtn');
  if (mockupBtn) {
    mockupBtn.addEventListener('click', () => {
      const isActive = mockupManager.toggle();
      mockupBtn.classList.toggle('active', isActive);
      showToast(isActive ? '🖥️ 桌面挂件透视已开启' : '关闭桌面挂件透视', 1200);
    });
  }

  // 11. 导出与下载
  async function downloadPNG() {
    showToast(`正在导出 ${state.targetW} × ${state.targetH} 高清壁纸...`, 2000);
    const blob = await exportToPNGBlob(state, state.targetW, state.targetH);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material_you_${state.artMode}_${state.targetW}x${state.targetH}_${state.seed}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ 已成功下载 ${state.targetW}×${state.targetH} 壁纸！`);
  }

  function downloadSVG() {
    exportToSVGFile(state, state.targetW, state.targetH);
    showToast('✓ 已导出矢量 SVG！');
  }

  async function copyClipboard() {
    try {
      showToast('正在渲染并复制到剪贴板...');
      await copyImageToClipboard(state, state.targetW, state.targetH);
      showToast('📋 已成功复制壁纸图片到剪贴板！');
    } catch {
      showToast('复制失败，请点击下载保存图片');
    }
  }

  document.getElementById('downloadPngBtn').addEventListener('click', downloadPNG);
  document.getElementById('downloadSvgBtn').addEventListener('click', downloadSVG);
  document.getElementById('copyClipboardBtn').addEventListener('click', copyClipboard);

  // 12. 全局快捷键
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      randomize();
    } else if (e.key === 'h' || e.key === 'H') {
      panel.classList.toggle('collapsed');
    } else if (e.key === 'm' || e.key === 'M') {
      mockupBtn.click();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        if (redoBtn) redoBtn.click();
      } else {
        if (undoBtn) undoBtn.click();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      copyClipboard();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      downloadPNG();
    }
  });

  updateUndoRedoUI();
}
