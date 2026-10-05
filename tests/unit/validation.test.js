import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDimensions, validateArtworkParameters } from '../../src/core/validation.js';
import { createDefaultState, validateWallpaperSnapshot } from '../../src/core/state.js';

test('output accepts boundary dimensions and rejects pixel-limit overflow', () => {
  for (const [width, height] of [[1, 1], [16384, 1], [8000, 8000], [16384, 3906]]) {
    assert.doesNotThrow(() => validateDimensions(width, height));
  }
  for (const [width, height] of [[16384, 3907], [8000, 8001], [16385, 1], [640.5, 480], ['640', 480]]) {
    assert.throws(() => validateDimensions(width, height), RangeError);
  }
});

test('drawing retains its wider numeric controls while editable snapshots match the UI', () => {
  const state = { ...createDefaultState(), bandCount: 8, angle: 250.5, curvature: 0 };
  assert.doesNotThrow(() => validateArtworkParameters(state));
  assert.throws(() => validateWallpaperSnapshot(state), RangeError);
  for (const values of [{ bandCount: 6, angle: 85, curvature: 0.9 }, { bandCount: 2, angle: -85, curvature: 0.1 }]) {
    assert.doesNotThrow(() => validateWallpaperSnapshot({ ...createDefaultState(), ...values }));
  }
});

test('artwork rejects nonnumeric, fractional count and invalid material inputs', () => {
  for (const values of [
    { bandCount: 2.5 }, { harmonics: 1.5 }, { seed: 1.5 }, { grain: NaN },
    { curvature: Infinity }, { seed: -1 }, { seed: 2147483647 }, { angle: '42' }
  ]) assert.throws(() => validateArtworkParameters({ ...createDefaultState(), ...values }), RangeError);
  for (const values of [{ hasShadow: 'false' }, { useGradient: 0 }, { color1: '#abc' },
    { color2: { toString: () => '#aabbcc' } }, { artMode: 'unknown' }]) {
    assert.throws(() => validateArtworkParameters({ ...createDefaultState(), ...values }), TypeError);
  }
  for (const value of [null, undefined, [], 'wallpaper', true]) {
    assert.throws(() => validateArtworkParameters(value), TypeError);
    assert.throws(() => validateWallpaperSnapshot(value), TypeError);
  }
});

test('snapshot validation normalizes colors without mutating the caller or retaining interface data', () => {
  const input = { ...createDefaultState(), color1: '#ABCDEF', extra: { nested: true } };
  const snapshot = validateWallpaperSnapshot(input);
  assert.equal(snapshot.color1, '#abcdef'); assert.equal(input.color1, '#ABCDEF');
  assert.equal('isDark' in snapshot, false); assert.equal('extra' in snapshot, false);
  assert.notEqual(snapshot, input);
});
