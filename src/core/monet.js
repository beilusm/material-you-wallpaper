/**
 * Material You (Monet / Material 3) 动态色彩引擎
 * 模拟 Android Jetpack Compose 的 DynamicColorScheme 逻辑
 * 根据用户壁纸色彩实时计算完整的 M3 Tonal Palette 规范色阶
 */

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * 依据壁纸主色推导 Compose Material 3 规范色彩 Token
 */
export function applyMaterialTheme(seedHex, isDark = true) {
  const { r, g, b } = hexToRgb(seedHex);
  const { h, s } = rgbToHsl(r, g, b);

  // 饱和度自适应校正
  const primaryChroma = Math.min(65, Math.max(30, s));
  const neutralChroma = Math.min(14, Math.max(4, Math.round(s * 0.2)));

  const root = document.documentElement;

  if (isDark) {
    // Jetpack Compose M3 Dark ColorScheme
    root.style.setProperty('--md-sys-color-primary', `hsl(${h}, ${primaryChroma}%, 78%)`);
    root.style.setProperty('--md-sys-color-on-primary', `hsl(${h}, ${primaryChroma + 15}%, 15%)`);
    root.style.setProperty('--md-sys-color-primary-container', `hsl(${h}, ${primaryChroma}%, 28%)`);
    root.style.setProperty('--md-sys-color-on-primary-container', `hsl(${h}, ${primaryChroma}%, 90%)`);

    root.style.setProperty('--md-sys-color-secondary', `hsl(${h}, ${Math.round(primaryChroma * 0.6)}%, 74%)`);
    root.style.setProperty('--md-sys-color-on-secondary', `hsl(${h}, ${Math.round(primaryChroma * 0.6)}%, 18%)`);
    root.style.setProperty('--md-sys-color-secondary-container', `hsl(${h}, ${Math.round(primaryChroma * 0.55)}%, 26%)`);
    root.style.setProperty('--md-sys-color-on-secondary-container', `hsl(${h}, ${Math.round(primaryChroma * 0.55)}%, 88%)`);

    root.style.setProperty('--md-sys-color-surface', `hsl(${h}, ${neutralChroma}%, 9%)`);
    root.style.setProperty('--md-sys-color-on-surface', `hsl(${h}, ${neutralChroma}%, 90%)`);
    root.style.setProperty('--md-sys-color-surface-dim', `hsl(${h}, ${neutralChroma}%, 7%)`);
    root.style.setProperty('--md-sys-color-surface-container-lowest', `hsl(${h}, ${neutralChroma}%, 6%)`);
    root.style.setProperty('--md-sys-color-surface-container-low', `hsl(${h}, ${neutralChroma}%, 11%)`);
    root.style.setProperty('--md-sys-color-surface-container', `hsl(${h}, ${neutralChroma}%, 14%)`);
    root.style.setProperty('--md-sys-color-surface-container-high', `hsl(${h}, ${neutralChroma}%, 18%)`);
    root.style.setProperty('--md-sys-color-surface-container-highest', `hsl(${h}, ${neutralChroma}%, 23%)`);

    root.style.setProperty('--md-sys-color-outline', `hsl(${h}, ${neutralChroma}%, 45%)`);
    root.style.setProperty('--md-sys-color-outline-variant', `hsl(${h}, ${neutralChroma}%, 25%)`);
    root.style.setProperty('--md-sys-color-inverse-surface', `hsl(${h}, ${neutralChroma}%, 90%)`);
    root.style.setProperty('--md-sys-color-inverse-on-surface', `hsl(${h}, ${neutralChroma}%, 16%)`);
  } else {
    // Jetpack Compose M3 Light ColorScheme
    root.style.setProperty('--md-sys-color-primary', `hsl(${h}, ${primaryChroma}%, 38%)`);
    root.style.setProperty('--md-sys-color-on-primary', `#ffffff`);
    root.style.setProperty('--md-sys-color-primary-container', `hsl(${h}, ${primaryChroma}%, 88%)`);
    root.style.setProperty('--md-sys-color-on-primary-container', `hsl(${h}, ${primaryChroma + 15}%, 12%)`);

    root.style.setProperty('--md-sys-color-secondary', `hsl(${h}, ${Math.round(primaryChroma * 0.6)}%, 42%)`);
    root.style.setProperty('--md-sys-color-on-secondary', `#ffffff`);
    root.style.setProperty('--md-sys-color-secondary-container', `hsl(${h}, ${Math.round(primaryChroma * 0.55)}%, 88%)`);
    root.style.setProperty('--md-sys-color-on-secondary-container', `hsl(${h}, ${Math.round(primaryChroma * 0.55)}%, 14%)`);

    root.style.setProperty('--md-sys-color-surface', `hsl(${h}, ${neutralChroma}%, 98%)`);
    root.style.setProperty('--md-sys-color-on-surface', `hsl(${h}, ${neutralChroma}%, 12%)`);
    root.style.setProperty('--md-sys-color-surface-container-low', `hsl(${h}, ${neutralChroma}%, 96%)`);
    root.style.setProperty('--md-sys-color-surface-container', `hsl(${h}, ${neutralChroma}%, 94%)`);
    root.style.setProperty('--md-sys-color-surface-container-high', `hsl(${h}, ${neutralChroma}%, 92%)`);
    root.style.setProperty('--md-sys-color-surface-container-highest', `hsl(${h}, ${neutralChroma}%, 90%)`);

    root.style.setProperty('--md-sys-color-outline', `hsl(${h}, ${neutralChroma}%, 55%)`);
    root.style.setProperty('--md-sys-color-outline-variant', `hsl(${h}, ${neutralChroma}%, 80%)`);
  }
}
