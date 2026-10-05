import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

export default defineConfig({
  ...base,
  projects: [
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit', launchOptions: { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE } } }
  ]
});
