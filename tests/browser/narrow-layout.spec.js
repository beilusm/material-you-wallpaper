import { test, expect } from './fixtures.js';

test('320px settings keep actions inside the sheet and allow editing and export', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.locator('#mobileSettingsBtn').click();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('#panel').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(569);
  await page.screenshot({ path: testInfo.outputPath('narrow.png') });
  const overflow = await page.locator('#panel').evaluate(panel => {
    const bounds = panel.getBoundingClientRect();
    return [...panel.querySelectorAll('button, input:not([type="file"])')]
      .filter(element => element.getClientRects().length)
      .filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.left < bounds.left || rect.right > bounds.right;
      }).map(element => element.id || element.textContent.trim());
  });
  expect(overflow).toEqual([]);
  for (const id of ['closePanelBtn', 'randomBtn', 'downloadPngBtn', 'copyClipboardBtn', 'downloadSvgBtn']) {
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(568);
  }
  await page.locator('#seedInput').fill('123');
  await page.locator('#seedForm button[type=submit]').click();
  await page.locator('#outputWidthInput').fill('640');
  await page.locator('#outputHeightInput').fill('480');
  await page.locator('#customResolutionForm button[type=submit]').click();
  await expect(page.locator('#outputSizeHint')).toContainText('640');
  const download = page.waitForEvent('download');
  await page.locator('#downloadSvgBtn').click();
  expect((await download).suggestedFilename()).toBe('material_you_waves_640x480_123.svg');
  await page.locator('#closePanelBtn').click();
  await expect(page.locator('#mobileSettingsBtn')).toBeFocused();
});
