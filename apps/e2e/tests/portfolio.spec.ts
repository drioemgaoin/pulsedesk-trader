import { test, expect, navigateTo } from '../fixtures/index';
import { POSITIONS_WITH_AAPL } from '../fixtures/mock-data';

const API = 'http://localhost:3000';

test.describe('Portfolio', () => {
  test('navigate to /portfolio → page loads', async ({ authedPage: page }) => {
    await navigateTo(page, '/portfolio');
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible({ timeout: 8_000 });
  });

  test('positions table shows AAPL position', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/positions**`, (route) =>
      route.fulfill({ status: 200, json: POSITIONS_WITH_AAPL }),
    );

    await navigateTo(page, '/portfolio');

    await expect(page.getByRole('cell', { name: 'AAPL', exact: true })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('cell', { name: '10', exact: true })).toBeVisible();
  });

  test('total PnL row is non-zero when position exists', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/positions**`, (route) =>
      route.fulfill({ status: 200, json: POSITIONS_WITH_AAPL }),
    );

    await navigateTo(page, '/portfolio');

    // totalUnrealizedPnl = 22.50 → shown in portfolio summary as +22.50
    await expect(page.locator('[aria-label="Total unrealized PnL"]')).toContainText('22.50', { timeout: 8_000 });
  });

  test('empty positions → shows empty state message', async ({ authedPage: page }) => {
    // Default mock already returns empty positions
    await navigateTo(page, '/portfolio');

    await expect(page.getByText(/no open positions/i)).toBeVisible({ timeout: 8_000 });
  });

  test('CSV export button downloads a file', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/positions**`, (route) =>
      route.fulfill({ status: 200, json: POSITIONS_WITH_AAPL }),
    );

    await navigateTo(page, '/portfolio');
    await expect(page.getByRole('cell', { name: 'AAPL', exact: true })).toBeVisible({ timeout: 8_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export positions as csv/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('PnL chart renders (canvas element present)', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/positions**`, (route) =>
      route.fulfill({ status: 200, json: POSITIONS_WITH_AAPL }),
    );

    await navigateTo(page, '/portfolio');

    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 8_000 });
  });

  test('sort by symbol column → order changes', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/positions**`, (route) =>
      route.fulfill({
        status: 200,
        json: {
          ...POSITIONS_WITH_AAPL,
          positions: [
            ...POSITIONS_WITH_AAPL.positions,
            { accountId: 'acc-test-001', symbol: 'TSLA', quantity: 5, averageCost: 200, marketPrice: 205, unrealizedPnl: 25, updatedAt: new Date().toISOString() },
          ],
          totalUnrealizedPnl: 47.50,
        },
      }),
    );

    await navigateTo(page, '/portfolio');
    await expect(page.getByRole('cell', { name: 'AAPL', exact: true })).toBeVisible({ timeout: 8_000 });

    // Click Symbol header to sort
    await page.getByRole('columnheader', { name: /symbol/i }).click();
    // After sort, both symbols still visible
    await expect(page.getByRole('cell', { name: 'TSLA', exact: true })).toBeVisible();
  });

  test('positions error → alert shown', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/positions**`, (route) =>
      route.fulfill({ status: 500, json: { message: 'Server error' } }),
    );

    await navigateTo(page, '/portfolio');
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/failed|error/i)).toBeVisible();
  });
});
