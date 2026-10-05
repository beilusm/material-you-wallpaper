import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

// Serve the real build at a nested path, matching GitHub Pages repository URLs.
const dist = resolve('dist');
const mount = '/studio/';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (!url.pathname.startsWith(mount)) { response.writeHead(404).end(); return; }
  const file = resolve(dist, url.pathname.slice(mount.length) || 'index.html');
  if (!file.startsWith(dist + '/')) { response.writeHead(404).end(); return; }
  try {
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const screenshotDir = process.env.WALLPAPER_QA_DIR;
let browser;
try {
  browser = await chromium.launch({ executablePath });
  const errors = [], failures = [];
  const recordFailures = page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    page.on('request', request => {
      if (!request.url().startsWith(origin + mount) && /^https?:/.test(request.url())) failures.push(request.url());
    });
  };
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  recordFailures(page);
  await page.goto(origin + mount);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => (await page.locator('#wallpaperCanvas').boundingBox()).width).toBeLessThanOrEqual(975);
  if (screenshotDir) await page.screenshot({ path: resolve(screenshotDir, 'desktop.png') });
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 4;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#cc4050'; ctx.fillRect(0, 0, 4, 4);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#imgFileInput').setInputFiles({ name: 'local.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await expect(page.locator('#toast')).toContainText('成功提取');
  await expect(page.locator('#extractFromImgBtn')).toBeEnabled();
  await page.locator('#undoBtn').click();
  await expect(page.locator('#color1Input')).toHaveValue('#b2ccc1');
  await page.locator('[data-mode="pebbles"]').click();
  const downloading = page.waitForEvent('download');
  await page.locator('#downloadSvgBtn').click();
  const svgDownload = await downloading;
  assert.equal(svgDownload.suggestedFilename(), 'material_you_pebbles_2736x1824_42.svg');
  const svg = await readFile(await svgDownload.path(), 'utf8');
  assert.ok(svg.includes('<svg') && svg.includes('<path'), 'Downloaded SVG content');

  await page.locator('#outputWidthInput').fill('640');
  await page.locator('#outputHeightInput').fill('480');
  await page.locator('#customResolutionForm button[type=submit]').click();
  const workerCreated = page.waitForEvent('worker');
  const pngDownload = page.waitForEvent('download');
  await page.locator('#downloadPngBtn').click();
  assert.ok((await workerCreated).url().startsWith(origin + mount + 'assets/'));
  const download = await pngDownload;
  assert.equal(download.suggestedFilename(), 'material_you_pebbles_640x480_42.png');
  const png = await readFile(await download.path());
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Downloaded PNG signature');
  assert.equal(png.readUInt32BE(16), 640, 'Downloaded PNG width');
  assert.equal(png.readUInt32BE(20), 480, 'Downloaded PNG height');
  await page.close(); // Keep only one page alive during local production checks.

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  recordFailures(mobile);
  await mobile.goto(origin + mount);
  await mobile.locator('#mobileSettingsBtn').click();
  await expect.poll(() => mobile.locator('#panel').evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(845);
  await expect(mobile.locator('#closePanelBtn')).toBeFocused();
  if (screenshotDir) await mobile.screenshot({ path: resolve(screenshotDir, 'mobile.png') });
  await mobile.keyboard.press('Escape');
  await expect(mobile.locator('#mobileSettingsBtn')).toBeFocused();
  await mobile.close();

  const landscape = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  recordFailures(landscape);
  await landscape.goto(origin + mount);
  await expect(landscape.locator('#mobileBottomBar')).toBeVisible();
  await landscape.locator('#mobileSettingsBtn').tap();
  await expect(landscape.locator('#panel')).toHaveAttribute('aria-modal', 'true');
  await expect.poll(() => landscape.locator('#panel').evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(391);
  if (screenshotDir) await landscape.screenshot({ path: resolve(screenshotDir, 'touch-landscape.png') });
  await landscape.keyboard.press('Escape');
  await expect(landscape.locator('#mobileSettingsBtn')).toBeFocused();
  assert.deepEqual(errors, [], 'Production JavaScript errors');
  assert.deepEqual(failures, [], 'Broken or external production assets');
  console.log('Production smoke passed: nested path, local fonts, image extraction/undo, SVG and worker PNG downloads, portrait/touch-landscape sheets and focus.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
