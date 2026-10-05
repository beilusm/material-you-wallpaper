import { hexToRgb, rgbToHsl, hslToHex, contrastRatio } from './color.js';

const hex = color => typeof color === 'string' ? color : hslToHex(color.h, color.s, color.l);
const css = color => typeof color === 'string' ? color : `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

function withContrast(color, backgrounds, lighter, minimum = 4.6) {
  const meets = lightness => backgrounds.every(background =>
    contrastRatio(hex({ ...color, l: lightness }), hex(background)) >= minimum);
  if (meets(color.l)) return color;
  let good = lighter ? 100 : 0, bad = color.l;
  for (let i = 0; i < 16; i++) {
    const mid = (good + bad) / 2;
    if (meets(mid)) good = mid; else bad = mid;
  }
  // Round toward the passing side and allow headroom for CSS color quantization.
  const l = (lighter ? Math.ceil(good * 100) : Math.floor(good * 100)) / 100;
  return { ...color, l };
}

/** HSL interface palette derived from wallpaper colors, with text contrast adjustments. */
export function createMaterialTheme(seedHex, isDark = true) {
  const { r, g, b } = hexToRgb(seedHex);
  const { h, s } = rgbToHsl(r, g, b);
  const primary = Math.round(Math.min(65, Math.max(30, s)));
  const neutral = Math.min(14, Math.max(4, Math.round(s * 0.2)));
  const secondary = Math.round(primary * 0.6), container = Math.round(primary * 0.55);
  const tone = (saturation, lightness) => ({ h, s: saturation, l: lightness });
  const colors = {
    primary: tone(primary, isDark ? 78 : 38),
    'on-primary': isDark ? tone(primary + 15, 15) : '#ffffff',
    'primary-container': tone(primary, isDark ? 28 : 88),
    'on-primary-container': tone(isDark ? primary : primary + 15, isDark ? 90 : 12),
    secondary: tone(secondary, isDark ? 74 : 42),
    'on-secondary': isDark ? tone(secondary, 18) : '#ffffff',
    'secondary-container': tone(container, isDark ? 26 : 88),
    'on-secondary-container': tone(container, isDark ? 88 : 14),
    surface: tone(neutral, isDark ? 9 : 98),
    'on-surface': tone(neutral, isDark ? 90 : 12),
    'surface-dim': tone(neutral, isDark ? 7 : 92),
    'surface-container-lowest': isDark ? tone(neutral, 6) : '#ffffff',
    'surface-container-low': tone(neutral, isDark ? 11 : 96),
    'surface-container': tone(neutral, isDark ? 14 : 94),
    'surface-container-high': tone(neutral, isDark ? 18 : 92),
    'surface-container-highest': tone(neutral, isDark ? 23 : 90),
    outline: tone(neutral, isDark ? 45 : 55),
    'outline-variant': tone(neutral, isDark ? 25 : 80),
    'inverse-surface': tone(neutral, isDark ? 90 : 20),
    'inverse-on-surface': tone(neutral, isDark ? 16 : 95),
    'inverse-primary': tone(primary, isDark ? 38 : 78)
  };
  const highest = colors['surface-container-highest'];
  colors.primary = withContrast(colors.primary, [highest, colors['on-primary']], isDark);
  colors.secondary = withContrast(colors.secondary, [highest, colors['on-secondary']], isDark);
  colors['on-primary-container'] = withContrast(colors['on-primary-container'], [colors['primary-container']], isDark);
  colors['on-secondary-container'] = withContrast(colors['on-secondary-container'], [colors['secondary-container']], isDark);
  colors['inverse-primary'] = withContrast(colors['inverse-primary'], [colors['inverse-surface']], !isDark);
  colors.outline = withContrast(colors.outline, [highest], isDark, 3.1);
  return { colorScheme: isDark ? 'dark' : 'light', colors: Object.fromEntries(
    Object.entries(colors).map(([name, color]) => [name, css(color)])
  ) };
}

export function applyMaterialTheme(seedHex, isDark = true) {
  const theme = createMaterialTheme(seedHex, isDark);
  const root = document.documentElement;
  const switching = root.style.colorScheme !== theme.colorScheme;
  if (switching) root.classList.add('theme-switching');
  root.style.colorScheme = theme.colorScheme;
  for (const [name, value] of Object.entries(theme.colors)) root.style.setProperty(`--md-sys-color-${name}`, value);
  if (switching) {
    // Commit inverted text/background roles without passing through matching gray colors.
    void root.offsetHeight;
    root.classList.remove('theme-switching');
  }
}
