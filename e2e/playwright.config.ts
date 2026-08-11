import { defineConfig, devices } from '@playwright/test';

// T009 frontend-preview recipe: frontend の Vite dev server（PM が別途起動）を対象に、
// アクセシビリティツリーベースの決定的シナリオを実行する。CTRF はワークツリー直下
// ctrf/ctrf-report.json に出力する（TASK CARD の CTRF="ctrf/ctrf-report.json" に一致）。
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['playwright-ctrf-json-reporter', { outputDir: '../ctrf', outputFile: 'ctrf-report.json' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5273',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
