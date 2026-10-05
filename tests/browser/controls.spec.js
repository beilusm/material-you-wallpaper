import { test, expect } from './fixtures.js';

test('unchanged choices do not add undo steps and restored palettes stay selected', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode="waves"]').click();
  await page.locator('[data-id="sage"]').click();
  await expect(page.locator('#undoBtn')).toBeDisabled();
  await page.locator('[data-id="lavender"]').click();
  await page.locator('#undoBtn').click();
  await expect(page.locator('[data-id="sage"]')).toHaveClass(/active/);
  await expect(page.locator('[data-id="lavender"]')).not.toHaveClass(/active/);
  await page.locator('[data-id="sage"]').click();
  await expect(page.locator('#redoBtn')).toBeEnabled();
  await page.locator('#redoBtn').click();
  await expect(page.locator('#color1Input')).toHaveValue('#c5c4e8');
});

test('download captures its artwork and ignores overlapping export requests', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-w="1920"]').click();
  await page.evaluate(() => {
    window.Worker = undefined; // Delay the fallback encoder to test immutable snapshots.
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, type) {
      return original.call(this, blob => setTimeout(() => callback(blob), 500), type);
    };
  });
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadPngBtn').click();
  await expect(page.locator('#downloadSvgBtn')).toBeDisabled();
  await page.locator('[data-mode="pebbles"]').click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('material_you_waves_1920x1080_42.png');
  await expect(page.locator('#downloadPngBtn')).toBeEnabled();
});

test('failed export shows an error and restores buttons', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { window.Worker = undefined; HTMLCanvasElement.prototype.toBlob = callback => callback(null); });
  await page.locator('#downloadPngBtn').click();
  await expect(page.locator('#toast')).toContainText('PNG 编码失败');
  await expect(page.locator('#downloadPngBtn')).toBeEnabled();
});

test('Space on a focused art button activates it instead of randomizing', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode="pebbles"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-mode="pebbles"]')).toHaveClass(/active/);
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-mode="waves"]')).toHaveClass(/active/);
});

test('image copy sends a PNG at the selected dimensions to the native clipboard', async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  if (browserName !== 'chromium') {
    // These Linux headless browsers cannot read back OS image clipboard data. Keep their native write
    // and inspect the actual ClipboardItem sent to that API, without bypassing permissions.
    await page.evaluate(() => {
      const write = navigator.clipboard.write.bind(navigator.clipboard);
      navigator.clipboard.write = items => { window.lastWrittenClipboardItem = items[0]; return write(items); };
    });
  }
  await page.locator('#outputWidthInput').fill('640');
  await page.locator('#outputHeightInput').fill('480');
  await page.locator('#customResolutionForm button[type=submit]').click();
  await page.locator('#copyClipboardBtn').click();
  await expect(page.locator('#toast')).toContainText('已成功复制');
  const dimensions = await page.evaluate(async browserName => {
    const item = browserName !== 'chromium' ? window.lastWrittenClipboardItem : (await navigator.clipboard.read())[0];
    const blob = await item.getType('image/png');
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close(); return size;
  }, browserName);
  expect(dimensions).toEqual({ width: 640, height: 480 });
});
