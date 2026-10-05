import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgb, rgbToHsl, hslToHex, relativeLuminance, contrastRatio } from '../../src/core/color.js';

test('color conversions reproduce primary colors, neutral tones and mixed RGB samples', () => {
  for (const color of ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#808080', '#000000', '#ffffff', '#b2ccc1', '#12a4ef']) {
    const { r, g, b } = hexToRgb(color), { h, s, l } = rgbToHsl(r, g, b);
    assert.equal(hslToHex(h, s, l), color);
  }
  assert.deepEqual(hexToRgb('#AbC'), { r: 170, g: 187, b: 204 });
  for (const value of ['#gggggg', '#abcd', 'red', null]) assert.throws(() => hexToRgb(value), TypeError);
});

test('WCAG sRGB luminance and contrast match independently known reference values', () => {
  assert.equal(relativeLuminance('#000000'), 0);
  assert.equal(relativeLuminance('#ffffff'), 1);
  assert.equal(relativeLuminance('#ff0000'), 0.2126);
  assert.equal(relativeLuminance('#00ff00'), 0.7152);
  assert.equal(relativeLuminance('#0000ff'), 0.0722);
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#abcdef', '#abcdef'), 1);
  assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - 4.478089453577214) < 1e-12);
  assert.equal(contrastRatio('#ffffff', '#777777'), contrastRatio('#777777', '#ffffff'));
});
