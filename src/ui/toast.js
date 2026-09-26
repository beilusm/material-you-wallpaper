let toastTimer = null;

export function showToast(message, duration = 2600, icon = null) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  if (icon) {
    toast.innerHTML = `<span class="material-symbols-rounded toast-icon">${icon}</span><span>${message}</span>`;
  } else {
    toast.textContent = message;
  }
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
