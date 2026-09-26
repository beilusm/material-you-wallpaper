/**
 * Material You 自然和谐调色板预设 (精选 12 种自然美学方案)
 * 采用低饱和、高明度差配比，契合 M3 Monet 动态着色美学
 */
export const PALETTES = [
  { id: 'sage', name: '鼠尾草绿', c1: '#b2ccc1', c2: '#e7f2ed' },
  { id: 'matcha', name: '宇治抹茶', c1: '#c4d7b2', c2: '#f1f5eb' },
  { id: 'lavender', name: '薰衣草紫', c1: '#c5c4e8', c2: '#f3f1f9' },
  { id: 'glacier', name: '冰川微蓝', c1: '#b0cbd6', c2: '#ebf3f6' },
  { id: 'apricot', name: '暮沙暖杏', c1: '#dfc4b8', c2: '#faf4f1' },
  { id: 'sakura', name: '早樱晨粉', c1: '#e8b8c8', c2: '#fcf3f6' },
  { id: 'mist', name: '灰雾金沙', c1: '#d2ccbe', c2: '#f7f5ef' },
  { id: 'clay', name: '陶土大地', c1: '#c9a690', c2: '#f6ece5' },
  { id: 'pine', name: '松针雨林', c1: '#537060', c2: '#e2ece6' },
  { id: 'ocean', name: '深海墨蓝', c1: '#4a6b82', c2: '#e1ecf4' },
  { id: 'dark', name: '墨夜绿境', c1: '#232b27', c2: '#131715' },
  { id: 'slate', name: '极简玄石', c1: '#2c3338', c2: '#191d21' }
];

/**
 * 随机生成一组全新的高质感自然配色
 */
export function generateRandomHarmoniousPalette() {
  const h = Math.floor(Math.random() * 360);
  const s = 25 + Math.floor(Math.random() * 20); // 25% - 45% 低饱和
  const c1 = hslToHex(h, s, 68);
  const c2 = hslToHex(h, Math.max(15, s - 10), 93);
  return { c1, c2 };
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
