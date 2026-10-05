/**
 * 桌面与手机小组件模拟层 (Desktop / Mobile Mockup Overlay)
 * 完全遵循 Material 3 设计规范的官方系统组件风格
 */
export function setupMockupOverlay(wrapper) {
  let overlay = document.getElementById('mockupOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mockupOverlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="mockup-clock-widget">
        <div class="mockup-time" id="mockupTime">10:00</div>
        <div class="mockup-date" id="mockupDate"></div>
      </div>
      <div class="mockup-dock">
        <div class="mockup-app-icon"><span class="material-symbols-rounded" aria-hidden="true">folder</span></div>
        <div class="mockup-app-icon"><span class="material-symbols-rounded" aria-hidden="true">language</span></div>
        <div class="mockup-app-icon"><span class="material-symbols-rounded" aria-hidden="true">terminal</span></div>
        <div class="mockup-app-icon"><span class="material-symbols-rounded" aria-hidden="true">settings</span></div>
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
    const dateEl = document.getElementById('mockupDate');
    if (dateEl) dateEl.textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now);
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
