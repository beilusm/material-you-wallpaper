import { test, expect } from './fixtures.js';

test('stalled compatibility encoding times out and releases its canvas', async ({ page }) => {
  await page.goto('/');
  await page.locator('#outputWidthInput').fill('320');
  await page.locator('#outputHeightInput').fill('200');
  await page.locator('#customResolutionForm button[type=submit]').click();
  await page.evaluate(() => {
    window.Worker = undefined;
    window.encodingStarted = false;
    HTMLCanvasElement.prototype.toBlob = function(callback) {
      window.encodingCanvas = this;
      window.finishEncoding = callback;
      window.encodingStarted = true;
    };
  });
  await page.clock.install();
  await page.locator('#downloadPngBtn').click();
  await expect.poll(() => page.evaluate(() => window.encodingStarted)).toBe(true);
  await page.clock.fastForward(120001);
  await expect(page.locator('#toast')).toContainText('耗时过长');
  await expect(page.locator('#downloadPngBtn')).toBeEnabled();
  await expect(page.locator('#exportStatus')).toBeHidden();
  expect(await page.evaluate(() => [window.encodingCanvas.width, window.encodingCanvas.height])).toEqual([0, 0]);
  let downloads = 0; page.on('download', () => downloads++);
  await page.evaluate(() => window.finishEncoding(new Blob(['late'], { type: 'image/png' })));
  await page.locator('#seedInput').fill('7');
  await page.locator('#seedForm button[type=submit]').click();
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadSvgBtn').click();
  expect((await downloading).suggestedFilename()).toBe('material_you_waves_320x200_7.svg');
  expect(downloads).toBe(1);
});

for (const mode of ['waves', 'pebbles', 'topography']) {
  for (const [width, height] of [[480, 320], [320, 640]]) {
    test(`${mode} ${width}×${height}: worker PNG keeps every rendered pixel`, async ({ page }) => {
      await page.goto('/');
      const result = await page.evaluate(async ({ mode, width, height }) => {
        const { exportToPNGBlob } = await import('/src/core/png-export.js');
        const { createDefaultState } = await import('/src/core/state.js');
        const state = { ...createDefaultState(), artMode: mode, seed: 8173, bandCount: 6,
          harmonics: 3, curvature: 0.9, useGradient: true, hasShadow: true, grain: 0.25 };
        const stages = [];
        const workerBlob = await exportToPNGBlob(state, width, height, { onProgress: stage => stages.push(stage) });
        const mainBlob = await exportToPNGBlob(state, width, height, { preferWorker: false });
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        const pixels = async blob => {
          const image = await createImageBitmap(blob);
          ctx.drawImage(image, 0, 0); image.close();
          return ctx.getImageData(0, 0, width, height).data;
        };
        const actual = await pixels(workerBlob), expected = await pixels(mainBlob);
        let differences = 0;
        for (let i = 0; i < actual.length; i++) if (actual[i] !== expected[i]) differences++;
        return { differences, stages, type: workerBlob.type };
      }, { mode, width, height });
      expect(result.differences).toBe(0);
      expect(result.stages).toEqual(['rendering', 'encoding']);
      expect(result.type).toBe('image/png');
      await expect.poll(() => page.workers().length).toBe(0);
    });
  }
}

async function setSmallOutput(page) {
  await page.locator('#outputWidthInput').fill('640');
  await page.locator('#outputHeightInput').fill('480');
  await page.locator('#customResolutionForm button[type=submit]').click();
}

test('large PNG export stays interactive and cancellation closes its worker', async ({ page }) => {
  test.setTimeout(60000); // Includes 20 MP setup, cancellation, editing and a second encoded download.
  await page.goto('/');
  await page.locator('[data-w="5472"]').click();
  await page.locator('label.m3-switch-row').filter({ has: page.locator('#gradientToggle') }).click();
  await page.locator('label.m3-switch-row').filter({ has: page.locator('#shadowToggle') }).click();
  await page.locator('#grainSlider').evaluate(el => {
    el.value = '25'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const downloads = []; page.on('download', download => downloads.push(download));
  const created = page.waitForEvent('worker');
  await page.locator('#downloadPngBtn').click();
  const worker = await created;
  const closed = new Promise(resolve => worker.once('close', resolve));
  await expect(page.locator('#exportStatus')).toBeVisible();
  await page.locator('[data-id="lavender"]').click();
  await expect(page.locator('#color1Input')).toHaveValue('#c5c4e8');
  await page.locator('#cancelExportBtn').click();
  await closed;
  await expect(page.locator('#exportStatus')).toBeHidden();
  await expect(page.locator('#downloadPngBtn')).toBeEnabled();
  await expect(page.locator('#toast')).toContainText('已取消导出');
  expect(downloads).toEqual([]);
  await setSmallOutput(page);
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadPngBtn').click();
  expect((await downloading).suggestedFilename()).toContain('640x480');
});

test('unavailable worker scripts fall back to the main-thread encoder', async ({ page }) => {
  await page.route('**/png-worker.js*', route => route.abort());
  await page.goto('/'); await setSmallOutput(page);
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadPngBtn').click();
  expect((await downloading).suggestedFilename()).toContain('640x480');
  await expect(page.locator('#downloadPngBtn')).toBeEnabled();
  await expect(page.locator('#exportStatus')).toBeHidden();
});

test('worker encoder failures are reported and a new export can succeed', async ({ page }) => {
  await page.route('**/png-worker.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: 'self.onmessage = () => self.postMessage({type: "error", message: "测试编码失败"});' }));
  await page.goto('/'); await setSmallOutput(page);
  await page.locator('#downloadPngBtn').click();
  await expect(page.locator('#toast')).toContainText('测试编码失败');
  await expect(page.locator('#downloadPngBtn')).toBeEnabled();
  await expect.poll(() => page.workers().length).toBe(0);
  await page.unroute('**/png-worker.js*');
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadPngBtn').click();
  expect((await downloading).suggestedFilename()).toContain('640x480');
});

test('already-canceled requests do not create workers or PNG canvases', async ({ page }) => {
  await page.goto('/');
  const name = await page.evaluate(async () => {
    const { exportToPNGBlob } = await import('/src/core/png-export.js');
    const { createDefaultState } = await import('/src/core/state.js');
    const controller = new AbortController(); controller.abort();
    try { await exportToPNGBlob(createDefaultState(), 640, 480, { signal: controller.signal }); }
    catch (error) { return error.name; }
  });
  expect(name).toBe('AbortError'); await expect.poll(() => page.workers().length).toBe(0);
});

for (const failure of ['write', 'item']) {
  test(`clipboard ${failure} rejection stops pending export and permits another download`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/png-worker.js*', route => route.fulfill({ contentType: 'text/javascript',
      body: 'self.onmessage = () => self.postMessage({type: "progress", stage: "rendering"});' }));
    await page.goto('/'); await setSmallOutput(page);
    await page.evaluate(failure => {
      const NativeWorker = window.Worker;
      window.exportWorkersCreated = window.exportWorkersStopped = 0;
      window.Worker = class extends NativeWorker {
        constructor(...args) { super(...args); window.exportWorkersCreated++; }
        terminate() { window.exportWorkersStopped++; return super.terminate(); }
      };
      if (failure === 'write') {
        navigator.clipboard.write = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      } else {
        window.ClipboardItem = class {
          constructor() { throw new DOMException('Clipboard blocked', 'SecurityError'); }
        };
      }
    }, failure);
    await page.locator('#copyClipboardBtn').click();
    await expect(page.locator('#toast')).toContainText('无法写入剪贴板');
    await expect(page.locator('#downloadPngBtn')).toBeEnabled();
    await expect(page.locator('#exportStatus')).toBeHidden();
    expect(await page.evaluate(() => [window.exportWorkersCreated, window.exportWorkersStopped])).toEqual([1, 1]);
    await expect.poll(() => page.workers().length).toBe(0);
    await page.unroute('**/png-worker.js*');
    const downloading = page.waitForEvent('download');
    await page.locator('#downloadPngBtn').click();
    expect((await downloading).suggestedFilename()).toContain('640x480');
    expect(errors).toEqual([]); // The canceled Blob promise must not become an unhandled rejection.
  });
}
