import { test, expect } from './fixtures.js';

async function imageBuffer(page, color) {
  const data = await page.evaluate(color => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 4;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 4, 4);
    return canvas.toDataURL().split(',')[1];
  }, color);
  return Buffer.from(data, 'base64');
}

async function holdImageDecode(page) {
  await page.evaluate(() => {
    const decode = window.createImageBitmap;
    window.originalDecode = decode;
    window.lateBitmapClosed = 0;
    window.decodeStarted = false;
    window.createImageBitmap = async (...args) => {
      const bitmap = await decode(...args);
      const close = bitmap.close.bind(bitmap);
      bitmap.close = () => { window.lateBitmapClosed++; close(); };
      window.decodeStarted = true;
      await new Promise(resolve => { window.releaseDecode = resolve; });
      return bitmap;
    };
  });
}

test('uniform images extract distinct colors and the change is undoable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#imgFileInput').setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: await imageBuffer(page, '#cc4050') });
  await expect(page.locator('#toast')).toContainText('成功提取');
  const colors = await page.locator('input[type=color]').evaluateAll(inputs => inputs.map(input => input.value));
  expect(colors[0]).not.toBe(colors[1]);
  expect(colors[0]).not.toBe('#b2ccc1');
  await page.locator('#undoBtn').click();
  await expect(page.locator('#color1Input')).toHaveValue('#b2ccc1');
  await expect(page.locator('#imgFileInput')).toHaveValue('');
});

test('invalid image data shows a useful error and allows a second import', async ({ page }) => {
  await page.goto('/');
  await page.locator('#imgFileInput').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.locator('#toast')).toContainText('图片无法读取');
  await expect(page.locator('#extractFromImgBtn')).toBeEnabled();
  await page.locator('#imgFileInput').setInputFiles({ name: 'green.png', mimeType: 'image/png', buffer: await imageBuffer(page, '#609070') });
  await expect(page.locator('#toast')).toContainText('成功提取');
});

test('dragging an image extracts colors and clears the drop overlay', async ({ page }) => {
  await page.goto('/');
  const png = (await imageBuffer(page, '#4050cc')).toString('base64');
  await page.evaluate(png => {
    const transfer = new DataTransfer();
    const bytes = Uint8Array.from(atob(png), character => character.charCodeAt(0));
    transfer.items.add(new File([bytes], 'blue.png', { type: 'image/png' }));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
  }, png);
  await expect(page.locator('#toast')).toContainText('成功提取');
  await expect(page.locator('body')).not.toHaveClass(/dragging-image/);
  await expect(page.locator('#color1Input')).not.toHaveValue('#b2ccc1');
});

test('the newest image wins when an earlier decode finishes later', async ({ page }) => {
  await page.goto('/');
  const red = (await imageBuffer(page, '#cc4050')).toString('base64');
  const green = (await imageBuffer(page, '#609070')).toString('base64');
  await page.evaluate(({ red, green }) => {
    const decode = window.createImageBitmap;
    let releaseFirst;
    window.firstDecode = new Promise(resolve => { releaseFirst = resolve; });
    let call = 0;
    window.createImageBitmap = async (...args) => {
      const index = call++;
      const bitmap = await decode(...args);
      if (index === 0) await window.firstDecode;
      return bitmap;
    };
    const drop = (png, name) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([Uint8Array.from(atob(png), c => c.charCodeAt(0))], name, { type: 'image/png' }));
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }));
    };
    window.releaseFirst = releaseFirst;
    drop(red, 'red.png'); drop(green, 'green.png');
  }, { red, green });
  await expect(page.locator('#toast')).toContainText('成功提取');
  const latestColor = await page.locator('#color1Input').inputValue();
  await page.evaluate(async () => { window.releaseFirst(); await window.firstDecode; });
  await expect(page.locator('#color1Input')).toHaveValue(latestColor);
  const expected = await page.evaluate(async () => {
    const { extractPaletteFromPixels } = await import('/src/core/extractor.js');
    return extractPaletteFromPixels([96, 144, 112, 255]).c1;
  });
  expect(latestColor).toBe(expected);
});

test('choosing a palette cancels a pending image and releases a late bitmap', async ({ page }) => {
  await page.goto('/');
  const png = await imageBuffer(page, '#cc4050');
  await holdImageDecode(page);
  await page.locator('#imgFileInput').setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: png });
  await expect.poll(() => page.evaluate(() => window.decodeStarted)).toBe(true);
  await page.locator('#paletteGrid button').nth(1).click();
  const chosenColor = await page.locator('#color1Input').inputValue();
  await expect(page.locator('#extractFromImgBtn')).toBeEnabled();
  await page.evaluate(() => window.releaseDecode());
  await expect.poll(() => page.evaluate(() => window.lateBitmapClosed)).toBe(1);
  await expect(page.locator('#color1Input')).toHaveValue(chosenColor);
});

test('undo cancels image analysis and preserves the restored history', async ({ page }) => {
  await page.goto('/');
  await page.locator('#paletteGrid button').nth(1).click();
  await holdImageDecode(page);
  await page.locator('#imgFileInput').setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: await imageBuffer(page, '#cc4050') });
  await expect.poll(() => page.evaluate(() => window.decodeStarted)).toBe(true);
  await page.locator('#undoBtn').click();
  await expect(page.locator('#extractFromImgBtn')).toBeEnabled();
  await page.evaluate(() => window.releaseDecode());
  await expect.poll(() => page.evaluate(() => window.lateBitmapClosed)).toBe(1);
  await expect(page.locator('#color1Input')).toHaveValue('#b2ccc1');
  await page.locator('#redoBtn').click();
  await expect(page.locator('#color1Input')).toHaveValue('#c4d7b2');
});

test('a stalled decoder times out, closes its late bitmap and allows another import', async ({ page }) => {
  await page.goto('/');
  const png = await imageBuffer(page, '#cc4050');
  await holdImageDecode(page);
  await page.clock.install();
  await page.locator('#imgFileInput').setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: png });
  await expect.poll(() => page.evaluate(() => window.decodeStarted)).toBe(true);
  await page.clock.fastForward(20001);
  await expect(page.locator('#toast')).toContainText('耗时过长');
  await expect(page.locator('#extractFromImgBtn')).toBeEnabled();
  await page.evaluate(() => { window.createImageBitmap = window.originalDecode; window.releaseDecode(); });
  await expect.poll(() => page.evaluate(() => window.lateBitmapClosed)).toBe(1);
  await page.locator('#imgFileInput').setInputFiles({ name: 'retry.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#toast')).toContainText('成功提取');
});
