import { exportToPNGBlob, copyImageToClipboard } from '../core/renderer.js';
import { exportToSVGFile } from '../core/svg-exporter.js';
import { snapshotWallpaper } from '../core/state.js';
import { downloadBlob } from '../core/download.js';
import { showToast } from './toast.js';

export function setupExportControls(state) {
  let currentJob = null;
  const buttons = ['downloadPngBtn', 'downloadSvgBtn', 'copyClipboardBtn', 'quickDownloadBtn', 'mobileDownloadBtn']
    .map(id => document.getElementById(id)).filter(Boolean);
  const status = document.getElementById('exportStatus');
  const statusText = document.getElementById('exportStatusText');
  const cancelBtn = document.getElementById('cancelExportBtn');

  async function runExport(operation) {
    if (currentJob) return;
    const controller = new AbortController();
    const job = { controller, trigger: document.activeElement };
    currentJob = job;
    const snapshot = snapshotWallpaper(state);
    buttons.forEach(btn => { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); });
    statusText.textContent = `正在生成 ${snapshot.targetW} × ${snapshot.targetH} 壁纸…`;
    status.hidden = false;
    const onProgress = stage => {
      if (currentJob !== job) return;
      statusText.textContent = stage === 'encoding' ? '正在保存 PNG…' :
        `正在生成 ${snapshot.targetW} × ${snapshot.targetH} 壁纸…`;
    };
    try {
      await operation(snapshot, { signal: controller.signal, onProgress });
    } catch (error) {
      if (controller.signal.aborted || error.name === 'AbortError') showToast('已取消导出', 1500, 'check_circle');
      else showToast(error.message || '导出失败，请重试或降低分辨率', 3500, 'error');
    } finally {
      controller.abort();
      if (currentJob === job) {
        const restoreFocus = document.activeElement === cancelBtn;
        currentJob = null;
        status.hidden = true;
        buttons.forEach(btn => { btn.disabled = false; btn.removeAttribute('aria-busy'); });
        if (restoreFocus && job.trigger?.isConnected && !job.trigger.closest('[inert]')) {
          job.trigger.focus({ preventScroll: true });
        }
      }
    }
  }

  function downloadPNG() {
    return runExport(async (snapshot, options) => {
      const { targetW: width, targetH: height, artMode, seed } = snapshot;
      const blob = await exportToPNGBlob(snapshot, width, height, options);
      if (options.signal.aborted) return;
      downloadBlob(blob, `material_you_${artMode}_${width}x${height}_${seed}.png`);
      showToast(`已成功保存 ${width}×${height} 壁纸！`, 2500, 'check_circle');
    });
  }

  function downloadSVG() {
    return runExport(snapshot => {
      exportToSVGFile(snapshot, snapshot.targetW, snapshot.targetH);
      showToast('已导出矢量 SVG！', 2000, 'check_circle');
    });
  }

  function copyClipboard() {
    return runExport(async (snapshot, options) => {
      await copyImageToClipboard(snapshot, snapshot.targetW, snapshot.targetH, options);
      if (!options.signal.aborted) showToast('已成功复制壁纸图片到剪贴板！', 2000, 'content_copy');
    });
  }

  ['downloadPngBtn', 'quickDownloadBtn', 'mobileDownloadBtn'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', downloadPNG));
  document.getElementById('downloadSvgBtn').addEventListener('click', downloadSVG);
  document.getElementById('copyClipboardBtn').addEventListener('click', copyClipboard);
  cancelBtn.addEventListener('click', () => currentJob?.controller.abort());
  window.addEventListener('pagehide', () => currentJob?.controller.abort());
  function setModalContainer(container) {
    if (status.parentElement === container) return;
    const active = status.contains(document.activeElement) ? document.activeElement : null;
    container.appendChild(status);
    active?.focus({ preventScroll: true });
  }
  return { downloadPNG, downloadSVG, copyClipboard, setModalContainer };
}
