import { PALETTES, deriveHarmoniousPair } from '../constants/palettes.js';
import { RESOLUTION_PRESETS } from '../constants/presets.js';
import { generateWaveParameters } from '../core/geometry.js';
import { exportToPNGBlob } from '../core/renderer.js';
import { exportToSVGFile } from '../core/svg-exporter.js';
import { showToast } from './toast.js';

export function setupControls(state, onStateChange) {
  // 1. 初始化波浪随机参数
  state.waveParams = generateWaveParameters(state.seed);

  // 2. 渲染调色板预设
  const paletteGrid = document.getElementById('paletteGrid');
  paletteGrid.innerHTML = '';

  PALETTES.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.className = `palette-btn ${idx === 0 ? 'active' : ''}`;
    btn.dataset.id = p.id;
    btn.innerHTML = `
      <div class="color-swatches">
        <div class="swatch" style="background: ${p.c1}"></div>
        <div class="swatch" style="background: ${p.c2}"></div>
      </div>
      <span>${p.name}</span>
    `;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.color1 = p.c1;
      state.color2 = p.c2;
      document.getElementById('color1Input').value = p.c1;
      document.getElementById('color2Input').value = p.c2;
      onStateChange();
    });
    paletteGrid.appendChild(btn);
  });

  // 3. 自定义拾色器
  const c1Input = document.getElementById('color1Input');
  const c2Input = document.getElementById('color2Input');

  c1Input.addEventListener('input', (e) => {
    state.color1 = e.target.value;
    document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
    onStateChange();
  });

  c2Input.addEventListener('input', (e) => {
    state.color2 = e.target.value;
    document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
    onStateChange();
  });

  document.getElementById('swapColorsBtn').addEventListener('click', () => {
    const temp = state.color1;
    state.color1 = state.color2;
    state.color2 = temp;
    c1Input.value = state.color1;
    c2Input.value = state.color2;
    onStateChange();
  });

  // 4. 滑块控制
  const bandSlider = document.getElementById('bandCountSlider');
  const angleSlider = document.getElementById('angleSlider');
  const curvSlider = document.getElementById('curvSlider');
  const freqSlider = document.getElementById('freqSlider');

  bandSlider.addEventListener('input', (e) => {
    state.bandCount = parseInt(e.target.value, 10);
    document.getElementById('bandCountVal').textContent = state.bandCount;
    onStateChange();
  });

  angleSlider.addEventListener('input', (e) => {
    state.angle = parseInt(e.target.value, 10);
    document.getElementById('angleVal').textContent = `${state.angle}°`;
    onStateChange();
  });

  curvSlider.addEventListener('input', (e) => {
    state.curvature = parseInt(e.target.value, 10) / 100;
    document.getElementById('curvVal').textContent = `${e.target.value}%`;
    onStateChange();
  });

  const freqLabels = ['简约单峰 (1x)', '双重流线 (2x)', '自然水波 (3x)'];
  freqSlider.addEventListener('input', (e) => {
    state.harmonics = parseInt(e.target.value, 10);
    document.getElementById('freqVal').textContent = freqLabels[state.harmonics - 1];
    onStateChange();
  });

  document.getElementById('shadowToggle').addEventListener('change', (e) => {
    state.hasShadow = e.target.checked;
    onStateChange();
  });

  // 5. 分辨率预设渲染
  const resGrid = document.getElementById('resGrid');
  resGrid.innerHTML = '';

  RESOLUTION_PRESETS.forEach((res) => {
    const btn = document.createElement('button');
    btn.className = `res-btn ${res.isDefault ? 'active' : ''}`;
    btn.dataset.w = res.w;
    btn.dataset.h = res.h;
    btn.innerHTML = `
      <div class="name">${res.name} <span class="badge">${res.badge}</span></div>
      <div class="dim">${res.w} × ${res.h}</div>
    `;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.res-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.targetW = res.w;
      state.targetH = res.h;
      onStateChange(true); // 改变尺寸通知更新画布宽高
    });
    resGrid.appendChild(btn);
  });

  // 6. 随机造型生成
  function randomize() {
    state.seed = Math.floor(Math.random() * 1000000);
    state.angle = -35 + Math.floor(Math.random() * 16 - 8);
    angleSlider.value = state.angle;
    document.getElementById('angleVal').textContent = `${state.angle}°`;
    state.waveParams = generateWaveParameters(state.seed);
    onStateChange();
    showToast('🎲 已随机生成新形态！', 1500);
  }

  document.getElementById('randomBtn').addEventListener('click', randomize);
  document.getElementById('quickRandomBtn').addEventListener('click', randomize);

  // 7. 面板折叠切换
  const panel = document.getElementById('panel');
  document.getElementById('togglePanelBtn').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
  });
  document.getElementById('closePanelBtn').addEventListener('click', () => {
    panel.classList.add('collapsed');
  });

  // 8. 导出与下载
  async function downloadPNG() {
    showToast(`正在导出 ${state.targetW} × ${state.targetH} 高清壁纸...`, 2000);
    const blob = await exportToPNGBlob(state, state.targetW, state.targetH);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `material_you_${state.targetW}x${state.targetH}_${state.seed}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ 已成功保存 ${state.targetW}×${state.targetH} PNG！`);
  }

  function downloadSVG() {
    exportToSVGFile(state, state.targetW, state.targetH);
    showToast('✓ 已成功保存矢量 SVG！');
  }

  document.getElementById('downloadPngBtn').addEventListener('click', downloadPNG);
  document.getElementById('downloadSvgBtn').addEventListener('click', downloadSVG);

  // 9. 全局快捷键
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      randomize();
    } else if (e.key === 'h' || e.key === 'H') {
      panel.classList.toggle('collapsed');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      downloadPNG();
    }
  });
}
