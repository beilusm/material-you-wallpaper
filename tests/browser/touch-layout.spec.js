import { test, expect } from './fixtures.js';

for (const viewport of [{ width: 844, height: 390 }, { width: 1024, height: 768 }]) {
  test(`touch landscape ${viewport.width}×${viewport.height} keeps the bottom bar and modal sheet`, async ({ browser, browserName, baseURL }) => {
    test.skip(browserName === 'firefox', 'Playwright does not support mobile viewport emulation in Firefox.');
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, baseURL });
    try {
      const page = await context.newPage();
      await page.goto('/');
      expect(await page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(true);
      await expect(page.locator('#mobileBottomBar')).toBeVisible();
      await expect(page.locator('#panel')).toHaveJSProperty('inert', true);
      await expect.poll(() => page.evaluate(() => {
        const rect = document.getElementById('wallpaperCanvas').getBoundingClientRect();
        return Math.abs(rect.width / rect.height - 1080 / 2400);
      })).toBeLessThan(0.005);
      await page.locator('#mobileSettingsBtn').tap();
      await expect(page.locator('#panel')).toHaveAttribute('aria-modal', 'true');
      await expect(page.locator('#closePanelBtn')).toBeFocused();
      await page.locator('#closePanelBtn').tap();
      await expect(page.locator('#mobileSettingsBtn')).toBeFocused();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#mobileSettingsBtn').tap();
      await expect(page.locator('#panel')).toHaveAttribute('aria-modal', 'true');
      await page.setViewportSize(viewport);
      await expect(page.locator('#panel')).toHaveAttribute('aria-modal', 'true');
      await page.keyboard.press('Escape');
      await expect(page.locator('#panel')).toHaveJSProperty('inert', true);
      const padding = await page.locator('#viewport').evaluate(element => {
        const style = getComputedStyle(element); return [style.paddingLeft, style.paddingRight];
      });
      expect(padding).toEqual(['12px', '12px']);
    } finally { await context.close(); }
  });
}
