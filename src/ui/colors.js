import { PALETTES, generateRandomHarmoniousPalette } from '../constants/palettes.js';
import { extractPaletteFromImage } from '../core/extractor.js';
import { showToast } from './toast.js';

/** Color editing and local image import share one update path. */
export function setupColorControls(state, { onChange }) {
  const grid = document.getElementById('paletteGrid');
  const inputs = [document.getElementById('color1Input'), document.getElementById('color2Input')];
  const chips = [];
  let extraction = null;
  grid.replaceChildren();
  for (const palette of PALETTES) {
    const button = document.createElement('button');
    button.className = 'm3-filter-chip'; button.dataset.id = palette.id;
    button.innerHTML = `<div class="color-swatches" aria-hidden="true">
      <div class="swatch" style="background:${palette.c1}"></div>
      <div class="swatch" style="background:${palette.c2}"></div></div><span>${palette.name}</span>`;
    button.addEventListener('click', () => applyPair(palette));
    grid.appendChild(button); chips.push({ button, palette });
  }

  function sync() {
    inputs[0].value = state.color1; inputs[1].value = state.color2;
    for (const { button, palette } of chips) {
      const active = palette.c1 === state.color1 && palette.c2 === state.color2;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    }
  }
  function applyPair(pair) {
    cancelExtraction(true);
    state.color1 = pair.c1; state.color2 = pair.c2;
    sync(); onChange(true);
  }
  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      cancelExtraction(true);
      state[index === 0 ? 'color1' : 'color2'] = input.value;
      sync(); onChange(false);
    });
    input.addEventListener('change', () => onChange(true));
  });
  document.getElementById('swapColorsBtn').addEventListener('click', () =>
    applyPair({ c1: state.color2, c2: state.color1 }));
  function randomize() {
    applyPair(generateRandomHarmoniousPalette());
    showToast('已生成灵感配色', 1200, 'palette');
  }
  document.getElementById('randomPaletteBtn').addEventListener('click', randomize);

  const fileInput = document.getElementById('imgFileInput');
  const extractButton = document.getElementById('extractFromImgBtn');
  extractButton.addEventListener('click', () => fileInput.click());
  function finishExtraction(job) {
    clearTimeout(job.timer);
    if (extraction !== job) return;
    extraction = null;
    fileInput.value = ''; extractButton.disabled = false; extractButton.removeAttribute('aria-busy');
  }
  function cancelExtraction(notify = false) {
    if (!extraction) return;
    const job = extraction;
    finishExtraction(job);
    job.controller.abort();
    if (notify) showToast('已取消图片分析', 1200, 'image_search');
  }
  async function extractAndApply(file) {
    if (!file) return;
    cancelExtraction();
    const job = { controller: new AbortController(), timer: null };
    extraction = job;
    job.timer = setTimeout(() => job.controller.abort(new Error('图片分析耗时过长，请缩小图片后重试')), 20000);
    extractButton.disabled = true; extractButton.setAttribute('aria-busy', 'true');
    try {
      showToast('正在分析图片提取色阶...', 2000, 'image_search');
      const pair = await extractPaletteFromImage(file, { signal: job.controller.signal });
      if (extraction !== job) return;
      finishExtraction(job);
      applyPair(pair);
      showToast('成功提取图片配色！', 2000, 'check_circle');
    } catch (error) {
      if (extraction === job && error.name !== 'AbortError') {
        showToast(error.message || '图片分析失败，请换一张试一下', 3000, 'error');
      }
    } finally {
      finishExtraction(job);
    }
  }
  fileInput.addEventListener('change', () => extractAndApply(fileInput.files?.[0]));

  let dragDepth = 0;
  const isFileDrag = event => Array.from(event.dataTransfer?.types || []).includes('Files');
  const clearDrag = () => { dragDepth = 0; document.body.classList.remove('dragging-image'); };
  window.addEventListener('dragenter', event => {
    if (!isFileDrag(event)) return;
    event.preventDefault(); dragDepth++; document.body.classList.add('dragging-image');
  });
  window.addEventListener('dragover', event => {
    if (!isFileDrag(event)) return;
    event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', event => {
    if (isFileDrag(event) && --dragDepth <= 0) clearDrag();
  });
  window.addEventListener('drop', event => {
    if (!isFileDrag(event)) return;
    event.preventDefault(); clearDrag(); extractAndApply(event.dataTransfer.files[0]);
  });
  window.addEventListener('dragend', clearDrag);
  window.addEventListener('pagehide', () => cancelExtraction());
  sync();
  return { sync, randomize, cancelExtraction };
}
