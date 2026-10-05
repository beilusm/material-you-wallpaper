import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWallpaperScene, validateDimensions } from '../../src/core/scene.js';
import { generateSVGString } from '../../src/core/svg-exporter.js';

const state = { artMode: 'waves', color1: '#b2ccc1', color2: '#e7f2ed',
  bandCount: 4, angle: -35, curvature: 0.42, harmonics: 1,
  hasShadow: false, useGradient: false, grain: 0, seed: 42 };

for (const artMode of ['waves', 'pebbles', 'topography']) {
  test(`${artMode} is deterministic and can export without derived wave parameters`, () => {
    const input = { ...state, artMode };
    assert.deepEqual(createWallpaperScene(input, 640, 480), createWallpaperScene(input, 640, 480));
    const svg = generateSVGString(input, 640, 480);
    assert.ok(!/NaN|undefined|Infinity/.test(svg));
    assert.equal(svg.match(/<path /g).length, createWallpaperScene(input, 640, 480).layers.length);
    assert.notEqual(generateSVGString({ ...input, seed: 43 }, 640, 480), svg);
    if (artMode === 'pebbles') assert.match(svg, / C/);
  });
}

test('SVG preserves enabled gradients and shadows', () => {
  const svg = generateSVGString({ ...state, useGradient: true, hasShadow: true }, 640, 480);
  assert.match(svg, /linearGradient/);
  assert.match(svg, /feDropShadow/);
});

test('invalid dimensions and state fail explicitly instead of silently drawing', () => {
  for (const dimensions of [[0, 480], [640.5, 480], [20000, 480], [10000, 10000], [NaN, 480]]) {
    assert.throws(() => validateDimensions(...dimensions), RangeError);
  }
  assert.throws(() => createWallpaperScene({ ...state, color1: '" onload="bad' }, 640, 480), TypeError);
  assert.throws(() => createWallpaperScene({ ...state, bandCount: 2.5 }, 640, 480), RangeError);
});
