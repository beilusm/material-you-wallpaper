import { test, expect } from './fixtures.js';

test('a focused slider supports artwork undo and both redo shortcuts', async ({ page }) => {
  await page.goto('/');
  const slider = page.locator('#curvSlider');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('43');
  await page.keyboard.press('Control+z'); await expect(slider).toHaveValue('42');
  await page.keyboard.press('Control+y'); await expect(slider).toHaveValue('43');
  await page.keyboard.press('Control+z'); await expect(slider).toHaveValue('42');
  await page.keyboard.press('Control+Shift+z'); await expect(slider).toHaveValue('43');
});

test('Space preserves focused checkbox activation and undo restores its artwork', async ({ page }) => {
  await page.goto('/');
  await page.locator('#gradientToggle').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#gradientToggle')).toBeChecked();
  await expect(page.locator('#seedInput')).toHaveValue('42');
  await page.keyboard.press('Control+z');
  await expect(page.locator('#gradientToggle')).not.toBeChecked();
  await expect(page.locator('#seedInput')).toHaveValue('42');
});

test('text and numeric editing retain native keys without invoking artwork commands', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-id="lavender"]').click();
  await page.locator('#seedInput').focus();
  await page.keyboard.press('Control+z');
  await expect(page.locator('#color1Input')).toHaveValue('#c5c4e8');
  await page.locator('#outputWidthInput').focus();
  await page.keyboard.press('m'); await page.keyboard.press('h');
  await expect(page.locator('#mockupOverlay')).not.toHaveClass(/active/);
  await expect(page.locator('#panel')).toHaveJSProperty('inert', false);
});

test('sharing dialog keeps artwork keyboard commands from acting behind it', async ({ page }) => {
  const downloads = []; page.on('download', download => downloads.push(download));
  await page.goto('/');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await page.locator('#shareBtn').click();
  await page.locator('#closeShareDialogBtn').focus();
  await page.keyboard.press('m'); await page.keyboard.press('h'); await page.keyboard.press('Control+s');
  await expect(page.locator('#mockupOverlay')).not.toHaveClass(/active/);
  await expect(page.locator('#panel')).toHaveJSProperty('inert', false);
  await expect(page.locator('#shareDialog')).toBeVisible();
  expect(downloads).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('#shareDialog')).not.toBeVisible();
  await page.locator('#randomBtn').focus(); await page.keyboard.press('m');
  await expect(page.locator('#mockupOverlay')).toHaveClass(/active/);
});
