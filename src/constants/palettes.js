/**
 * Material You 自然和谐调色板预设
 * 采用低饱和、高明度差配比，契合 M3 Monet 动态着色美学
 */
export const PALETTES = [
  { id: 'sage', name: '原版鼠尾草绿', c1: '#b2ccc1', c2: '#e7f2ed' },
  { id: 'matcha', name: '轻抹茶奶霜', c1: '#c4d7b2', c2: '#f1f5eb' },
  { id: 'lavender', name: '极简薰衣草', c1: '#c5c4e8', c2: '#f3f1f9' },
  { id: 'glacier', name: '冰川微凉蓝', c1: '#b0cbd6', c2: '#ebf3f6' },
  { id: 'apricot', name: '暖杏柔暮沙', c1: '#dfc4b8', c2: '#faf4f1' },
  { id: 'mist', name: '极简灰雾金', c1: '#d2ccbe', c2: '#f7f5ef' },
  { id: 'dark', name: '深色墨夜绿', c1: '#232b27', c2: '#131715' },
  { id: 'slate', name: '深色玄石灰', c1: '#2c3338', c2: '#191d21' }
];

/**
 * 根据基础色计算 Material 3 和谐互补色对
 */
export function deriveHarmoniousPair(hexColor) {
  // Hex to HSL
  let c = hexColor.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

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
    h /= 6;
  }

  // 构造一对高明度/低饱和的互补层次
  const hDeg = Math.round(h * 360);
  const color1 = `hsl(${hDeg}, 24%, 72%)`;
  const color2 = `hsl(${hDeg}, 35%, 93%)`;
  return { color1, color2 };
}
