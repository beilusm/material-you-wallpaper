import { test, expect } from './fixtures.js';

for (const artMode of ['waves', 'pebbles', 'topography']) {
  for (const [name, effects] of [
    ['flat', {}], ['gradient', { useGradient: true }], ['shadow', { hasShadow: true }],
    ['all effects', { useGradient: true, hasShadow: true, grain: 0.25 }]
  ]) {
    test(`${artMode}: SVG matches Canvas with ${name}`, async ({ page }) => {
      await page.goto('/');
      const metrics = await page.evaluate(async ({ artMode, effects }) => {
        const { renderWallpaper } = await import('/src/core/renderer.js');
        const { generateSVGString } = await import('/src/core/svg-exporter.js');
        const state = { artMode, color1: '#537060', color2: '#e2ece6', bandCount: 6,
          angle: -55, curvature: 0.9, harmonics: 3, hasShadow: false,
          useGradient: false, grain: 0, seed: 8173, ...effects };
        const width = 480, height = 320;
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        renderWallpaper(ctx, state, width, height);
        const reference = ctx.getImageData(0, 0, width, height).data;
        const url = URL.createObjectURL(new Blob([generateSVGString(state, width, height)], { type: 'image/svg+xml' }));
        const image = new Image();
        try {
          image.src = url;
          await image.decode();
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0);
          const actual = ctx.getImageData(0, 0, width, height).data;
          let error = 0, differing = 0;
          for (let i = 0; i < actual.length; i += 4) {
            let pixelError = 0;
            for (let channel = 0; channel < 3; channel++) pixelError += Math.abs(actual[i + channel] - reference[i + channel]);
            error += pixelError;
            if (pixelError > 30) differing++;
          }
          return { meanError: error / (width * height * 3), differingFraction: differing / (width * height) };
        } finally { URL.revokeObjectURL(url); }
      }, { artMode, effects });
      expect(metrics.meanError).toBeLessThan(1.5);
      expect(metrics.differingFraction).toBeLessThan(0.015);
    });
  }
}

test('renderer restores caller context and grain is deterministic', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { renderWallpaper } = await import('/src/core/renderer.js');
    const state = { artMode: 'waves', color1: '#b2ccc1', color2: '#e7f2ed', bandCount: 4,
      angle: -35, curvature: 0.42, harmonics: 1, hasShadow: true, useGradient: true, grain: 0.25, seed: 42 };
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#123456'; ctx.shadowBlur = 3; ctx.globalAlpha = 0.5;
    renderWallpaper(ctx, state, 320, 200);
    const first = canvas.toDataURL();
    renderWallpaper(ctx, state, 320, 200);
    return { equal: first === canvas.toDataURL(), fill: ctx.fillStyle, blur: ctx.shadowBlur, alpha: ctx.globalAlpha };
  });
  expect(result).toEqual({ equal: true, fill: '#123456', blur: 3, alpha: 0.5 });
});

test('PNG encoding and invalid output dimensions reject with useful errors', async ({ page }) => {
  await page.goto('/');
  const errors = await page.evaluate(async () => {
    const { exportToPNGBlob } = await import('/src/core/renderer.js');
    const state = { artMode: 'waves', color1: '#b2ccc1', color2: '#e7f2ed', bandCount: 4,
      angle: -35, curvature: 0.42, harmonics: 1, hasShadow: false, useGradient: false, grain: 0, seed: 42 };
    const messages = [];
    try { await exportToPNGBlob(state, 0, 320); } catch (error) { messages.push(error.message); }
    window.Worker = undefined; // Exercise the compatibility encoder's null-Blob failure.
    HTMLCanvasElement.prototype.toBlob = callback => callback(null);
    try { await exportToPNGBlob(state, 480, 320); } catch (error) { messages.push(error.message); }
    return messages;
  });
  expect(errors[0]).toContain('输出尺寸');
  expect(errors[1]).toContain('PNG 编码失败');
});
