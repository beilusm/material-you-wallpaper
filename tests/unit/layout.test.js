import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitPreview } from '../../src/core/layout.js';

for (const [availableWidth, availableHeight, targetW, targetH] of [
  [974, 852, 2736, 1824], [366, 736, 1080, 2400], [366, 736, 3840, 2160], [1, 1, 1080, 2400]
]) {
  test(`preview fits ${availableWidth}×${availableHeight} with ${targetW}:${targetH} aspect`, () => {
    const fit = fitPreview({ availableWidth, availableHeight, targetW, targetH, dpr: 3 });
    assert.ok(fit.cssWidth <= availableWidth + 1e-9);
    assert.ok(fit.cssHeight <= availableHeight + 1e-9);
    assert.ok(Math.abs(fit.cssWidth / fit.cssHeight - targetW / targetH) < 1e-9);
    assert.ok(fit.pixelWidth > 0 && fit.pixelHeight > 0);
  });
}

test('large displays do not allocate an oversized preview framebuffer', () => {
  const fit = fitPreview({ availableWidth: 7000, availableHeight: 4000, targetW: 2736, targetH: 1824, dpr: 2 });
  assert.ok(fit.pixelWidth * fit.pixelHeight < 4010000);
});
