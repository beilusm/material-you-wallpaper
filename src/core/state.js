export const WALLPAPER_KEYS = Object.freeze([
  'artMode', 'targetW', 'targetH', 'color1', 'color2', 'bandCount', 'angle',
  'curvature', 'harmonics', 'hasShadow', 'useGradient', 'grain', 'seed'
]);

/** Derived geometry and interface preferences are not part of an artwork snapshot. */
export function snapshotWallpaper(state) {
  return Object.fromEntries(WALLPAPER_KEYS.map(key => [key, state[key]]));
}

export function createDefaultState(portrait = false) {
  return {
    artMode: 'waves', isDark: true,
    targetW: portrait ? 1080 : 2736, targetH: portrait ? 2400 : 1824,
    color1: '#b2ccc1', color2: '#e7f2ed', bandCount: 4, angle: portrait ? -55 : -35,
    curvature: 0.42, harmonics: 1, hasShadow: false, useGradient: false, grain: 0, seed: 42
  };
}

export function validateWallpaperSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('作品数据格式无效');
  const snapshot = snapshotWallpaper(value);
  validateArtworkParameters(snapshot, { editable: true });
  validateDimensions(snapshot.targetW, snapshot.targetH);
  snapshot.color1 = snapshot.color1.toLowerCase();
  snapshot.color2 = snapshot.color2.toLowerCase();
  return snapshot;
}
import { validateArtworkParameters, validateDimensions } from './validation.js';
