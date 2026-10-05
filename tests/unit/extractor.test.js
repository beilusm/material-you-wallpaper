import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPaletteFromPixels } from '../../src/core/extractor.js';

const pixels = (color, count) => Array.from({ length: count }, () => color).flat();
const brightness = hex => {
  const channels = hex.slice(1).match(/../g).map(n => parseInt(n, 16));
  return channels[0] * 0.299 + channels[1] * 0.587 + channels[2] * 0.114;
};

test('transparent pixels do not pollute an image palette', () => {
  const opaque = pixels([60, 140, 100, 255], 100);
  assert.deepEqual(extractPaletteFromPixels([...pixels([255, 0, 0, 0], 1000), ...opaque]), extractPaletteFromPixels(opaque));
  assert.deepEqual(extractPaletteFromPixels(pixels([255, 0, 0, 0], 100)), { c1: '#b2ccc1', c2: '#e7f2ed' });
});

test('uniform and grayscale images still yield distinct harmonious tones', () => {
  for (const color of [[0, 0, 0, 255], [255, 255, 255, 255], [120, 120, 120, 255], [200, 60, 80, 255]]) {
    const result = extractPaletteFromPixels(pixels(color, 100));
    assert.ok(/^#[\da-f]{6}$/.test(result.c1));
    assert.ok(brightness(result.c2) - brightness(result.c1) > 40);
  }
});

test('isolated bright-color noise does not displace a dominant color', () => {
  const dominant = pixels([60, 140, 100, 255], 1000);
  assert.deepEqual(extractPaletteFromPixels([...dominant, 255, 0, 0, 255]), extractPaletteFromPixels(dominant));
});
