import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HistoryManager } from '../../src/core/history.js';

const state = seed => ({ artMode: 'waves', targetW: 640, targetH: 480,
  color1: '#b2ccc1', color2: '#e7f2ed', bandCount: 4, angle: -35,
  curvature: 0.42, harmonics: 1, hasShadow: false, useGradient: false, grain: 0, seed });

test('same state does not occupy history or discard redo', () => {
  const h = new HistoryManager();
  h.push(state(1)); h.push(state(2)); h.undo();
  assert.equal(h.push(state(1)), false);
  assert.equal(h.canRedo(), true);
  assert.equal(h.redo().seed, 2);
});

test('branching after undo discards only the abandoned branch', () => {
  const h = new HistoryManager();
  [1, 2, 3].forEach(n => h.push(state(n)));
  h.undo(); h.push(state(4));
  assert.equal(h.canRedo(), false);
  assert.equal(h.undo().seed, 2);
  assert.equal(h.undo().seed, 1);
  assert.equal(h.undo(), null);
});

test('bounded history remains traversable after overflow', () => {
  const h = new HistoryManager(3);
  for (let n = 1; n <= 100; n++) h.push(state(n));
  assert.equal(h.stack.length, 3);
  assert.equal(h.undo().seed, 99);
  assert.equal(h.undo().seed, 98);
  assert.equal(h.undo(), null);
  assert.equal(h.redo().seed, 99);
  assert.equal(h.redo().seed, 100);
});

test('snapshots cannot mutate stored history and omit derived UI state', () => {
  const h = new HistoryManager();
  const first = { ...state(1), isDark: true, waveParams: [{ p1: 1 }] };
  h.push(first); first.seed = 5; h.push(state(2));
  const snap = h.undo(); snap.seed = 9;
  assert.equal('waveParams' in snap, false);
  assert.equal('isDark' in snap, false);
  h.redo(); assert.equal(h.undo().seed, 1);
});
