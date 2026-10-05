import { test, expect } from './fixtures.js';

test('saturated custom colors keep visible theme text and input boundaries readable', async ({ page }) => {
  await page.goto('/');
  for (const seed of ['#ffff00', '#00ff00', '#00ffff', '#0000ff']) {
    await page.locator('#color1Input').evaluate((input, seed) => {
      input.value = seed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, seed);
    for (const dark of [true, false]) {
      if ((await page.locator('#themeIcon').textContent()) !== (dark ? 'dark_mode' : 'light_mode')) {
        await page.locator('#themeToggleBtn').click();
      }
      const ratios = await page.evaluate(() => {
        const rgb = css => css.match(/[\d.]+/g).slice(0, 3).map(Number);
        const luminance = color => color.map(value => value / 255)
          .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
          .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
        const contrast = (a, b) => {
          const x = luminance(a), y = luminance(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        };
        const style = selector => getComputedStyle(document.querySelector(selector));
        const button = style('#downloadPngBtn'), title = style('.section-title'), panel = style('#panel');
        const input = style('#seedInput'), card = style('.m3-res-card.active'), dim = style('.m3-res-card.active .dim');
        const background = rgb(card.backgroundColor), foreground = rgb(dim.color), alpha = Number(dim.opacity);
        const dimColor = foreground.map((value, index) => value * alpha + background[index] * (1 - alpha));
        return {
          button: contrast(rgb(button.color), rgb(button.backgroundColor)),
          title: contrast(rgb(title.color), rgb(panel.backgroundColor)),
          dimension: contrast(dimColor, background),
          input: contrast(rgb(input.color), rgb(input.backgroundColor)),
          border: contrast(rgb(input.borderTopColor), rgb(input.backgroundColor))
        };
      });
      for (const text of ['button', 'title', 'dimension', 'input']) {
        expect(ratios[text], `${seed} ${dark ? 'dark' : 'light'} ${text}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(ratios.border).toBeGreaterThanOrEqual(3);
    }
  }
});
