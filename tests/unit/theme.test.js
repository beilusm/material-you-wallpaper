import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMaterialTheme } from '../../src/core/monet.js';
import { hslToHex, contrastRatio } from '../../src/core/color.js';
import { PALETTES } from '../../src/constants/palettes.js';

function colorHex(color) {
  if (color.startsWith('#')) return color;
  const [h, s, l] = color.match(/[\d.]+/g).map(Number);
  return hslToHex(h, s, l);
}
const textPairs = [
  ['on-primary', 'primary'], ['on-primary-container', 'primary-container'],
  ['on-secondary', 'secondary'], ['on-secondary-container', 'secondary-container'],
  ['primary', 'surface-container-highest'], ['secondary', 'surface-container-highest'],
  ['on-surface', 'surface-container-highest'], ['inverse-on-surface', 'inverse-surface'],
  ['inverse-primary', 'inverse-surface']
];

for (const isDark of [true, false]) {
  test(`${isDark ? 'dark' : 'light'} theme keeps preset and custom-hue text readable`, () => {
    const seeds = new Set(['#000000', '#ffffff', '#808080', ...PALETTES.map(palette => palette.c1)]);
    for (let hue = 0; hue < 360; hue++) seeds.add(hslToHex(hue, 100, 50));
    for (const seed of seeds) {
      const { colors, colorScheme } = createMaterialTheme(seed, isDark);
      assert.equal(colorScheme, isDark ? 'dark' : 'light');
      for (const [text, background] of textPairs) {
        const ratio = contrastRatio(colorHex(colors[text]), colorHex(colors[background]));
        assert.ok(ratio >= 4.5, `${seed}: ${text} on ${background} = ${ratio}`);
      }
      assert.ok(contrastRatio(colorHex(colors.outline), colorHex(colors['surface-container-highest'])) >= 3);
    }
  });
}

test('theme generation is deterministic, independent of DOM, and preserves independent results', () => {
  const initial = createMaterialTheme('#b2ccc1');
  const other = createMaterialTheme('#b2ccc1');
  assert.deepEqual(initial, other);
  initial.colors.primary = '#000000';
  assert.deepEqual(createMaterialTheme('#b2ccc1'), other);
  assert.equal(createMaterialTheme('#abc', false).colorScheme, 'light');
});
