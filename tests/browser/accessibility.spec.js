import { test, expect } from './fixtures.js';

test('mobile sheet keeps keyboard focus inside and restores focus on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#panel')).toHaveJSProperty('inert', true);
  await page.locator('#mobileSettingsBtn').click();
  await expect(page.locator('#panel')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('#panel')).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('#closePanelBtn')).toBeFocused();
  await page.locator('#themeToggleBtn').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#downloadSvgBtn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#themeToggleBtn')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#panel')).toHaveJSProperty('inert', true);
  await expect(page.locator('#mobileSettingsBtn')).toBeFocused();
  await expect(page.locator('#viewport')).toHaveJSProperty('inert', false);
});

test('hidden desktop controls are inert and selected choices expose their state', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#floatingTools')).toHaveJSProperty('inert', true);
  await expect(page.getByLabel('色调 A')).toHaveValue('#b2ccc1');
  await expect(page.getByLabel('流线倾斜角度')).toHaveValue('-35');
  await page.locator('[data-mode="pebbles"]').click();
  await expect(page.locator('[data-mode="pebbles"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-mode="waves"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#closePanelBtn').click();
  await expect(page.locator('#panel')).toHaveJSProperty('inert', true);
  await expect(page.locator('#floatingTools')).toHaveJSProperty('inert', false);
  await expect(page.locator('#togglePanelBtn')).toBeFocused();
});

test('fonts load locally and the app makes no external font requests', async ({ page }) => {
  const external = [];
  page.on('request', request => { if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) external.push(request.url()); });
  await page.goto('/');
  expect(await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('20px "Material Symbols Rounded"');
  })).toBe(true);
  expect(external).toEqual([]);
});

test('light theme updates viewport, snackbar and native control scheme', async ({ page }) => {
  await page.goto('/');
  const dark = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface-dim'));
  await page.locator('#themeToggleBtn').click();
  const light = await page.evaluate(() => ({
    scheme: document.documentElement.style.colorScheme,
    background: getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-surface-dim'),
    inverse: getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-inverse-surface')
  }));
  expect(light.scheme).toBe('light'); expect(light.background).not.toBe(dark);
  expect(light.inverse).toContain('20%');
});

test('mobile export cancellation participates in the modal focus order', async ({ page }) => {
  await page.route('**/png-worker.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: 'self.onmessage = () => self.postMessage({type: "progress", stage: "rendering"});' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#mobileSettingsBtn').click();
  await page.locator('#downloadPngBtn').click();
  await expect(page.locator('#exportStatus')).toBeVisible();
  await expect(page.locator('#panel #cancelExportBtn')).toHaveCount(1);
  await page.locator('#themeToggleBtn').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#cancelExportBtn')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#exportStatus')).toBeHidden();
  await expect(page.locator('#downloadPngBtn')).toBeFocused();
});

test('switching desktop to mobile updates modal focus and restores background access', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#panel')).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('#closePanelBtn')).toBeFocused();
  await expect(page.locator('#viewport')).toHaveJSProperty('inert', true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('#panel')).not.toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('#viewport')).toHaveJSProperty('inert', false);
});

test('the mobile handle closes the sheet after a downward pointer gesture', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await page.locator('#mobileSettingsBtn').click();
  await page.locator('#sheetDragHandle').hover(); // Wait for the opening transition before taking coordinates.
  const handle = await page.locator('#sheetDragHandle').boundingBox();
  expect(handle.height).toBeGreaterThanOrEqual(24);
  // Start above the thin visual bar, inside its larger touch area.
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 80, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('#panel')).toHaveJSProperty('inert', true);
  await expect(page.locator('#mobileSettingsBtn')).toBeFocused();
});
