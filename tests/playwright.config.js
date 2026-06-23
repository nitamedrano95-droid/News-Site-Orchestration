import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  retries: 1,
  workers: 1, // secuencial — no crear sesiones paralelas en producción

  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    baseURL: 'https://nexopress-hub-ui.pages.dev',
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/playwright-report', open: 'never' }],
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
