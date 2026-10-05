import { chromium, firefox, webkit } from '@playwright/test';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

const browserName = process.env.WALLPAPER_BENCHMARK_BROWSER || 'chromium';
const browserType = { chromium, firefox, webkit }[browserName];
if (!browserType) throw new Error('Choose chromium, firefox or webkit for the benchmark');
const executablePath = browserName === 'chromium' ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) :
  browserName === 'webkit' ? process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE : undefined;
const browser = await browserType.launch({ executablePath });
try {
  const page = await browser.newPage();
  await page.goto(process.env.WALLPAPER_BENCHMARK_URL || 'http://127.0.0.1:4174');
  const records = [];
  for (const mode of ['waves', 'pebbles', 'topography']) {
    for (const effects of [false, true]) {
      const record = await page.evaluate(async ({ mode, effects }) => {
        const { exportToPNGBlob } = await import('/src/core/renderer.js');
        const { createDefaultState } = await import('/src/core/state.js');
        const state = { ...createDefaultState(), artMode: mode, targetW: 5472, targetH: 3648,
          bandCount: 6, useGradient: effects, hasShadow: effects, grain: effects ? 0.25 : 0 };
        let last = performance.now(), maxFrameGap = 0, frames = 0, running = true;
        function tick(time) {
          maxFrameGap = Math.max(maxFrameGap, time - last); last = time; frames++;
          if (running) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        await new Promise(requestAnimationFrame);
        const started = performance.now();
        const blob = await exportToPNGBlob(state, state.targetW, state.targetH);
        const durationMs = performance.now() - started;
        await new Promise(requestAnimationFrame);
        running = false;
        return { mode, effects, width: state.targetW, height: state.targetH,
          durationMs: Math.round(durationMs), maxFrameGapMs: Math.round(maxFrameGap), frames, bytes: blob.size };
      }, { mode, effects });
      records.push(record);
      console.log(JSON.stringify(record));
    }
  }
  const report = { recordedAt: new Date().toISOString(), browserName, browser: browser.version(), records };
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2) + '\n');
} finally { await browser.close(); }
