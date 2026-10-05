let toastTimer = null;

export function showToast(message, duration = 2600, icon = null) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.replaceChildren();
  if (icon) {
    const symbol = document.createElement('span');
    symbol.className = 'material-symbols-rounded toast-icon';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = icon;
    toast.appendChild(symbol);
  }
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
