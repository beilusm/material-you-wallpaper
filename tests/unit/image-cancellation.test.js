import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractPaletteFromImage } from '../../src/core/extractor.js';

const imageFile = () => new Blob(['image'], { type: 'image/png' });
function replaceGlobal(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
}

test('pre-canceled image extraction never starts decoding', async t => {
  let calls = 0;
  replaceGlobal(t, 'createImageBitmap', () => { calls++; });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(extractPaletteFromImage(imageFile(), { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('cancellation rejects promptly and releases a bitmap that finishes later', async t => {
  let release, closed = 0;
  replaceGlobal(t, 'createImageBitmap', () => new Promise(resolve => { release = resolve; }));
  const controller = new AbortController();
  const extracting = extractPaletteFromImage(imageFile(), { signal: controller.signal });
  controller.abort();
  await assert.rejects(extracting, { name: 'AbortError' });
  release({ close() { closed++; } });
  await Promise.resolve();
  assert.equal(closed, 1);
});

test('a late decoder rejection is observed after cancellation', async t => {
  let rejectDecode;
  replaceGlobal(t, 'createImageBitmap', () => new Promise((resolve, reject) => { rejectDecode = reject; }));
  const controller = new AbortController();
  const extracting = extractPaletteFromImage(imageFile(), { signal: controller.signal });
  controller.abort();
  await assert.rejects(extracting, { name: 'AbortError' });
  rejectDecode(new Error('late decoder failure'));
  await new Promise(resolve => setImmediate(resolve));
});

test('image-element cancellation removes callbacks and revokes its object URL', async t => {
  let image, removed = 0, revoked = [];
  replaceGlobal(t, 'createImageBitmap', undefined);
  replaceGlobal(t, 'Image', class {
    constructor() { image = this; }
    removeAttribute(name) { assert.equal(name, 'src'); removed++; }
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:test-image');
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url));
  const controller = new AbortController();
  const extracting = extractPaletteFromImage(imageFile(), { signal: controller.signal });
  assert.equal(image.src, 'blob:test-image');
  const reason = new Error('timeout'); controller.abort(reason);
  await assert.rejects(extracting, error => error === reason);
  assert.equal(image.onload, null); assert.equal(image.onerror, null);
  assert.equal(removed, 1); assert.deepEqual(revoked, ['blob:test-image']);
});

test('a decoded bitmap is closed even if canvas creation fails', async t => {
  let closed = 0;
  const failure = new Error('canvas unavailable');
  replaceGlobal(t, 'createImageBitmap', async () => ({ close() { closed++; } }));
  replaceGlobal(t, 'document', { createElement() { throw failure; } });
  await assert.rejects(extractPaletteFromImage(imageFile()), error => error === failure);
  assert.equal(closed, 1);
});

test('successful image-element sampling releases the image and canvas', async t => {
  let image, removed = 0, revoked = [];
  const canvas = { getContext: () => ({ drawImage() {}, getImageData: () => ({ data: [96, 144, 112, 255] }) }) };
  replaceGlobal(t, 'createImageBitmap', undefined);
  replaceGlobal(t, 'document', { createElement: () => canvas });
  replaceGlobal(t, 'Image', class {
    constructor() { image = this; }
    set src(value) { queueMicrotask(() => this.onload?.()); }
    removeAttribute(name) { assert.equal(name, 'src'); removed++; }
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:test-image');
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url));
  const result = await extractPaletteFromImage(imageFile());
  assert.match(result.c1, /^#[\da-f]{6}$/);
  assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
  assert.equal(image.onload, null); assert.equal(image.onerror, null);
  assert.equal(removed, 1); assert.deepEqual(revoked, ['blob:test-image']);
});
