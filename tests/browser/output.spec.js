import { test, expect } from './fixtures.js';

test('custom output dimensions are exported exactly, swapped and undoable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#outputWidthInput').fill('640');
  await page.locator('#outputHeightInput').fill('480');
  await page.locator('#customResolutionForm button[type=submit]').click();
  await expect(page.locator('#outputSizeHint')).toContainText('640 × 480');
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadPngBtn').click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('material_you_waves_640x480_42.png');
  const fs = await import('node:fs/promises');
  const png = await fs.readFile(await download.path());
  expect(png.readUInt32BE(16)).toBe(640);
  expect(png.readUInt32BE(20)).toBe(480);
  await page.locator('#swapDimensionsBtn').click();
  await expect(page.locator('#outputWidthInput')).toHaveValue('480');
  await expect(page.locator('#outputHeightInput')).toHaveValue('640');
  await page.locator('#undoBtn').click();
  await expect(page.locator('#outputWidthInput')).toHaveValue('640');
  await expect(page.locator('#outputHeightInput')).toHaveValue('480');
});

test('oversized output leaves the current artwork unchanged', async ({ page }) => {
  await page.goto('/');
  await page.locator('#outputWidthInput').fill('10000');
  await page.locator('#outputHeightInput').fill('10000');
  await page.locator('#customResolutionForm button[type=submit]').click();
  await expect(page.locator('#toast')).toContainText('总像素不超过');
  await expect(page.locator('#outputSizeHint')).toContainText('2736 × 1824');
  await expect(page.locator('#undoBtn')).toBeDisabled();
});

test('seed edits persist, drive reproducible exports and can be undone', async ({ page }) => {
  await page.goto('/');
  await page.locator('#seedInput').fill('8173');
  await page.locator('#seedForm button').click();
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadSvgBtn').click();
  expect((await downloading).suggestedFilename()).toContain('_8173.svg');
  await page.locator('#undoBtn').click();
  await expect(page.locator('#seedInput')).toHaveValue('42');
  await page.locator('#redoBtn').click();
  await expect(page.locator('#seedInput')).toHaveValue('8173');
  await page.reload();
  await expect(page.locator('#seedInput')).toHaveValue('8173');
});

test('mode controls only offer parameters that affect the selected style', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode="pebbles"]').click();
  await expect(page.locator('#freqControl')).toBeHidden();
  await expect(page.locator('#bandCountLabel')).toHaveText('圆石数量');
  await expect(page.locator('#bandCountVal')).toHaveText('5');
  await expect(page.locator('#angleSlider')).toBeDisabled();
  await page.locator('label.m3-switch-row').filter({ has: page.locator('#gradientToggle') }).click();
  await expect(page.locator('#angleSlider')).toBeEnabled();
  await page.locator('[data-mode="topography"]').click();
  await expect(page.locator('#freqControl')).toBeVisible();
  await expect(page.locator('#bandCountVal')).toHaveText('6');
  await page.locator('[data-mode="waves"]').click();
  await expect(page.locator('#bandCountVal')).toHaveText('4');
});
