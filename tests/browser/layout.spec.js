import { test, expect } from './fixtures.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 960, height: 960 }]) {
  test(`preview preserves aspect and stays in its content box at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => {
      const canvas = document.getElementById('wallpaperCanvas');
      const rect = canvas.getBoundingClientRect();
      const portrait = innerWidth <= 768 || innerHeight >= innerWidth;
      return Math.abs(rect.width / rect.height - (portrait ? 1080 / 2400 : 2736 / 1824));
    })).toBeLessThan(0.005);
    const box = await page.evaluate(() => {
      const view = document.getElementById('viewport');
      const style = getComputedStyle(view);
      const rect = document.getElementById('wallpaperCanvas').getBoundingClientRect();
      return { x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom,
        viewportWidth: view.clientWidth, windowWidth: innerWidth,
        maxX: view.clientWidth - parseFloat(style.paddingRight),
        maxY: view.clientHeight - parseFloat(style.paddingBottom) };
    });
    expect(box.viewportWidth).toBeLessThanOrEqual(box.windowWidth);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.maxX + 1);
    expect(box.bottom).toBeLessThanOrEqual(box.maxY + 1);
  });
}

test('closing the desktop panel refits the preview after the padding transition', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await page.locator('#wallpaperCanvas').boundingBox()).width).toBeLessThanOrEqual(975);
  const first = await page.locator('#wallpaperCanvas').boundingBox();
  await page.locator('#closePanelBtn').click();
  await expect.poll(async () => (await page.locator('#wallpaperCanvas').boundingBox()).width).toBeGreaterThan(first.width + 50);
  await expect.poll(() => page.evaluate(() => {
    const rect = document.getElementById('wallpaperCanvas').getBoundingClientRect();
    return Math.abs(rect.width / rect.height - 1.5);
  })).toBeLessThan(0.005);
});
