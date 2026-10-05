import { WALLPAPER_KEYS, validateWallpaperSnapshot } from './state.js';

export const SESSION_KEY = 'material-you-wallpaper.session.v1';

export function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

export function encodeWallpaper(state) {
  const snapshot = validateWallpaperSnapshot(state);
  return btoa(JSON.stringify([1, ...WALLPAPER_KEYS.map(key => snapshot[key])]))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeWallpaper(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 2048 || !/^[\w-]+$/.test(encoded)) {
    throw new TypeError('分享链接中的作品数据无效');
  }
  let values;
  try { values = JSON.parse(atob(encoded.replaceAll('-', '+').replaceAll('_', '/'))); }
  catch { throw new TypeError('分享链接中的作品数据无法读取'); }
  if (!Array.isArray(values) || values[0] !== 1 || values.length !== WALLPAPER_KEYS.length + 1) {
    throw new TypeError('不支持此作品数据版本');
  }
  return validateWallpaperSnapshot(Object.fromEntries(WALLPAPER_KEYS.map((key, index) => [key, values[index + 1]])));
}

export function wallpaperFromHash(hash) {
  const encoded = new URLSearchParams(hash.replace(/^#/, '')).get('wallpaper');
  return encoded === null ? null : decodeWallpaper(encoded);
}

export function createShareURL(state, href) {
  const url = new URL(href);
  url.hash = new URLSearchParams({ wallpaper: encodeWallpaper(state) }).toString();
  return url.href;
}

export function saveSession(state, storage) {
  if (!storage) return false;
  try {
    storage.setItem(SESSION_KEY, JSON.stringify({ version: 1,
      wallpaper: validateWallpaperSnapshot(state), preferences: { isDark: state.isDark } }));
    return true;
  } catch { return false; }
}

export function restoreSession(defaults, storage, hash = '') {
  const state = { ...defaults };
  let source = null;
  let error = null;
  try {
    const saved = JSON.parse(storage?.getItem(SESSION_KEY) || 'null');
    if (saved?.version === 1) {
      Object.assign(state, validateWallpaperSnapshot(saved.wallpaper));
      if (typeof saved.preferences?.isDark === 'boolean') state.isDark = saved.preferences.isDark;
      source = 'saved';
    }
  } catch { /* A corrupt or unavailable cache should never prevent startup. */ }
  try {
    const linked = wallpaperFromHash(hash);
    if (linked) { Object.assign(state, linked); source = 'shared'; }
  } catch (cause) { error = cause.message; }
  return { state, source, error };
}
