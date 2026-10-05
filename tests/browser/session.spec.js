import { test, expect } from './fixtures.js';

const sharedState = { artMode: 'waves', targetW: 3840, targetH: 2160,
  color1: '#abcdef', color2: '#fedcba', bandCount: 6, angle: 42, curvature: 0.78,
  harmonics: 3, hasShadow: true, useGradient: true, grain: 0.25, seed: 8173 };

async function shareURL(page, state) {
  return page.evaluate(async state => {
    const { createShareURL } = await import('/src/core/session.js');
    return createShareURL(state, location.href);
  }, state);
}

test('reload restores artwork controls and theme', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode="topography"]').click();
  await page.locator('[data-id="lavender"]').click();
  await page.locator('#themeToggleBtn').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('material-you-wallpaper.session.v1'))?.wallpaper.artMode)).toBe('topography');
  await page.reload();
  await expect(page.locator('[data-mode="topography"]')).toHaveClass(/active/);
  await expect(page.locator('[data-id="lavender"]')).toHaveClass(/active/);
  await expect(page.locator('#color1Input')).toHaveValue('#c5c4e8');
  await expect(page.locator('#themeIcon')).toHaveText('light_mode');
  await expect(page.locator('#undoBtn')).toBeDisabled();
});

test('shared URL restores every control and overrides a saved session', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode="pebbles"]').click();
  await page.goto(await shareURL(page, sharedState));
  await expect(page.locator('[data-mode="waves"]')).toHaveClass(/active/);
  await expect(page.locator('#color1Input')).toHaveValue('#abcdef');
  await expect(page.locator('#color2Input')).toHaveValue('#fedcba');
  await expect(page.locator('#bandCountSlider')).toHaveValue('6');
  await expect(page.locator('#angleSlider')).toHaveValue('42');
  await expect(page.locator('#curvSlider')).toHaveValue('78');
  await expect(page.locator('#freqSlider')).toHaveValue('3');
  await expect(page.locator('#grainSlider')).toHaveValue('25');
  await expect(page.locator('#shadowToggle')).toBeChecked();
  await expect(page.locator('#gradientToggle')).toBeChecked();
  await expect(page.locator('[data-w="3840"]')).toHaveClass(/active/);
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadSvgBtn').click();
  expect((await downloading).suggestedFilename()).toBe('material_you_waves_3840x2160_8173.svg');
});

test('changing the shared hash is undoable', async ({ page }) => {
  await page.goto('/');
  const url = await shareURL(page, { ...sharedState, artMode: 'pebbles' });
  await page.evaluate(url => { location.hash = new URL(url).hash; }, url);
  await expect(page.locator('[data-mode="pebbles"]')).toHaveClass(/active/);
  await page.locator('#undoBtn').click();
  await expect(page.locator('[data-mode="waves"]')).toHaveClass(/active/);
  await expect(page.locator('#color1Input')).toHaveValue('#b2ccc1');
});

test('sharing has a selectable-link fallback without clipboard access', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await page.locator('#shareBtn').click();
  await expect(page.locator('#shareDialog')).toBeVisible();
  await expect(page.locator('#shareUrlInput')).toHaveValue(/#wallpaper=/);
  await expect(page.locator('#shareUrlInput')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#shareDialog')).not.toBeVisible();
});

test('bad saved data and invalid links leave a working application', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('material-you-wallpaper.session.v1', '{broken'));
  await page.goto('/#wallpaper=invalid!');
  await expect(page.locator('#toast')).toContainText('作品数据无效');
  await page.locator('[data-mode="pebbles"]').click();
  await expect(page.locator('[data-mode="pebbles"]')).toHaveClass(/active/);
  await expect(page.locator('#wallpaperCanvas')).toBeVisible();
});
