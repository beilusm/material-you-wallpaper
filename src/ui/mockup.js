/**
 * 桌面与手机小组件模拟层 (Desktop / Mobile Mockup Overlay)
 * 完全遵循 Material 3 设计规范的官方系统组件风格
 */
export function setupMockupOverlay(wrapper) {
  let overlay = document.getElementById('mockupOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mockupOverlay';
    overlay.innerHTML = `
      <div class="mockup-clock-widget">
        <div class="mockup-time" id="mockupTime">10:00</div>
        <div class="mockup-date" id="mockupDate">9月26日 星期六</div>
      </div>
      <div class="mockup-dock">
        <div class="mockup-app-icon"><span class="material-symbols-rounded">folder</span></div>
        <div class="mockup-app-icon"><span class="material-symbols-rounded">language</span></div>
        <div class="mockup-app-icon"><span class="material-symbols-rounded">terminal</span></div>
        <div class="mockup-app-icon"><span class="material-symbols-rounded">settings</span></div>
      </div>
    `;
    wrapper.appendChild(overlay);
  }

  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('mockupTime');
    if (timeEl) timeEl.textContent = `${h}:${m}`;
  }
  updateClock();
  setInterval(updateClock, 30000);

  return {
    toggle(visible) {
      if (visible !== undefined) {
        overlay.classList.toggle('active', visible);
      } else {
        overlay.classList.toggle('active');
      }
      return overlay.classList.contains('active');
    }
  };
}
