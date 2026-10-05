import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, snapshotWallpaper } from '../../src/core/state.js';
import { encodeWallpaper, decodeWallpaper, createShareURL, restoreSession, saveSession, SESSION_KEY } from '../../src/core/session.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('sharing round-trips every artwork parameter and omits interface state', () => {
  const input = { ...createDefaultState(), artMode: 'pebbles', isDark: false, grain: 0.25,
    hasShadow: true, useGradient: true, seed: 2147483646, waveParams: ['obsolete'] };
  assert.deepEqual(decodeWallpaper(encodeWallpaper(input)), snapshotWallpaper(input));
  const link = new URL(createShareURL(input, 'https://example.com/studio/?lang=zh#old'));
  assert.equal(link.pathname, '/studio/'); assert.equal(link.search, '?lang=zh');
  assert.ok(link.hash.startsWith('#wallpaper='));
  assert.ok(link.href.length < 500);
});

test('saved session restores artwork and theme, and shared artwork takes priority', () => {
  const storage = memoryStorage();
  const saved = { ...createDefaultState(), artMode: 'topography', isDark: false, seed: 100 };
  assert.equal(saveSession(saved, storage), true);
  assert.deepEqual(restoreSession(createDefaultState(true), storage).state, saved);
  const linked = { ...createDefaultState(true), seed: 200 };
  const restored = restoreSession(createDefaultState(), storage, `#wallpaper=${encodeWallpaper(linked)}`);
  assert.equal(restored.source, 'shared');
  assert.equal(restored.state.seed, 200); assert.equal(restored.state.targetW, 1080);
  assert.equal(restored.state.isDark, false);
});

test('corrupt or unavailable storage does not prevent startup', () => {
  const storage = memoryStorage(); storage.setItem(SESSION_KEY, '{bad json');
  const defaults = createDefaultState();
  assert.deepEqual(restoreSession(defaults, storage).state, defaults);
  const unavailable = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(restoreSession(defaults, unavailable).state, defaults);
  assert.equal(saveSession(defaults, unavailable), false);
  assert.equal(saveSession(defaults, null), false);
});

test('invalid and future share data cannot modify saved artwork', () => {
  const storage = memoryStorage(); const saved = { ...createDefaultState(), seed: 8173 };
  saveSession(saved, storage);
  for (const encoded of ['bad!', 'a'.repeat(2049), btoa('[2]'), btoa('[1,"waves"]')]) {
    assert.throws(() => decodeWallpaper(encoded));
    const restored = restoreSession(createDefaultState(), storage, `#wallpaper=${encodeURIComponent(encoded)}`);
    assert.equal(restored.state.seed, 8173); assert.ok(restored.error);
  }
  assert.throws(() => encodeWallpaper({ ...saved, targetW: 10000, targetH: 10000 }));
  assert.throws(() => encodeWallpaper({ ...saved, hasShadow: 'false' }));
});

test('invalid saves leave the last valid artwork available for recovery', () => {
  const storage = memoryStorage();
  const saved = { ...createDefaultState(), seed: 8173, isDark: false };
  assert.equal(saveSession(saved, storage), true);
  const original = storage.getItem(SESSION_KEY);
  for (const values of [{ seed: NaN }, { color1: '' }, { targetW: 10000, targetH: 10000 }, { hasShadow: 'false' }]) {
    assert.equal(saveSession({ ...saved, ...values }, storage), false);
    assert.equal(storage.getItem(SESSION_KEY), original);
  }
  assert.deepEqual(restoreSession(createDefaultState(), storage).state, saved);
});
