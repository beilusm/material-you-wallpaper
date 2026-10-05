import { isMobileLayout, MOBILE_LAYOUT_QUERY } from './layout.js';

/** Manage disclosure, modal focus and pointer gestures independently of artwork state. */
export function setupPanelControls({ onStateChange, onModalChange }) {
  const panel = document.getElementById('panel');
  const scrim = document.getElementById('sheetScrim');
  const closeBtn = document.getElementById('closePanelBtn');
  let focusBeforeSheet = null;
  let wasModal = false;

  if (isMobileLayout()) {
    panel.classList.add('collapsed');
    document.body.classList.add('panel-collapsed');
  }

  function syncDisclosure() {
    const collapsed = panel.classList.contains('collapsed');
    const modal = isMobileLayout() && !collapsed;
    panel.inert = collapsed;
    panel.setAttribute('aria-hidden', String(collapsed));
    panel.setAttribute('role', modal ? 'dialog' : 'complementary');
    if (modal) panel.setAttribute('aria-modal', 'true'); else panel.removeAttribute('aria-modal');
    scrim.classList.toggle('active', modal);
    document.getElementById('viewport').inert = modal;
    document.getElementById('mobileBottomBar').inert = modal;
    document.getElementById('floatingTools').inert = !collapsed || isMobileLayout();
    ['togglePanelBtn', 'mobileSettingsBtn'].forEach(id => {
      const button = document.getElementById(id);
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-controls', 'panel');
    });
    onModalChange?.(modal ? panel : document.body);
    if (modal && !wasModal && !panel.contains(document.activeElement)) closeBtn.focus({ preventScroll: true });
    wasModal = modal;
  }

  function openSheet() {
    focusBeforeSheet = document.activeElement;
    panel.classList.remove('collapsed'); document.body.classList.remove('panel-collapsed');
    syncDisclosure(); closeBtn.focus({ preventScroll: true }); onStateChange(true);
  }

  function closeSheet() {
    panel.classList.add('collapsed'); document.body.classList.add('panel-collapsed');
    syncDisclosure();
    const fallback = document.getElementById(isMobileLayout() ? 'mobileSettingsBtn' : 'togglePanelBtn');
    const restore = focusBeforeSheet && focusBeforeSheet !== document.body && !panel.contains(focusBeforeSheet) &&
      !focusBeforeSheet.closest('[inert]') && focusBeforeSheet.getClientRects().length ? focusBeforeSheet : fallback;
    restore.focus({ preventScroll: true }); onStateChange(true);
  }

  function toggleSheet() { if (panel.classList.contains('collapsed')) openSheet(); else closeSheet(); }
  document.getElementById('togglePanelBtn').addEventListener('click', toggleSheet);
  document.getElementById('mobileSettingsBtn').addEventListener('click', toggleSheet);
  closeBtn.addEventListener('click', closeSheet); scrim.addEventListener('click', closeSheet);
  window.matchMedia(MOBILE_LAYOUT_QUERY).addEventListener('change', syncDisclosure);

  window.addEventListener('keydown', event => {
    if (document.getElementById('shareDialog').open || panel.classList.contains('collapsed')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeSheet(); }
    else if (event.key === 'Tab' && isMobileLayout()) {
      const focusable = [...panel.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    }
  });

  let dragStart = null;
  const handle = document.getElementById('sheetDragHandle');
  handle.addEventListener('pointerdown', event => {
    if (!isMobileLayout() || panel.classList.contains('collapsed')) return;
    dragStart = event.clientY;
    try { handle.setPointerCapture(event.pointerId); } catch { /* Synthetic or canceled pointer. */ }
  });
  handle.addEventListener('pointermove', event => {
    if (dragStart !== null && event.clientY - dragStart > 50) { dragStart = null; closeSheet(); }
  });
  handle.addEventListener('pointerup', () => { dragStart = null; });
  handle.addEventListener('pointercancel', () => { dragStart = null; });
  syncDisclosure();
  return { panel, openSheet, closeSheet, toggleSheet };
}
