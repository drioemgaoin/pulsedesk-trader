import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against the full dev:frontend stack.
 *
 * Quick start:
 *   pnpm dev:frontend          # in one terminal (builds remotes + starts all servers)
 *   pnpm --filter @pulsedesk/e2e test   # in another terminal
 *
 * Or use the webServer option below to have Playwright manage the servers.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,          // tests share mocked state; run sequentially per file
  workers: 1,
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
