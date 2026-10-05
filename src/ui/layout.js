export const MOBILE_LAYOUT_QUERY = '(max-width: 768px), (orientation: portrait), (hover: none) and (pointer: coarse)';
export function isMobileLayout() { return window.matchMedia(MOBILE_LAYOUT_QUERY).matches; }
