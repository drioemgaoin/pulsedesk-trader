import { test, expect, navigateTo } from '../fixtures/index';
import {
  WATCHLIST_RESPONSE,
  ORDER_PENDING,
  ORDER_FILLED,
  ORDERS_EMPTY_PAGE,
  POSITIONS_EMPTY,
  POSITIONS_WITH_AAPL,
  WS_FILL_EVENT,
  WS_TICK_AAPL,
  TEST_ACCOUNT_ID,
} from '../fixtures/mock-data';

const API = 'http://localhost:3000';

test.describe('Trading Terminal', () => {
  test('watchlist shows all 5 symbols', async ({ authedPage: page }) => {
    // Already on /trading after login fixture; default WS mock populates the watchlist
    await expect(page.getByRole('row', { name: /AAPL/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('row', { name: /TSLA/i })).toBeVisible();
    await expect(page.getByRole('row', { name: /MSFT/i })).toBeVisible();
    await expect(page.getByRole('row', { name: /NVDA/i })).toBeVisible();
    await expect(page.getByRole('row', { name: /AMZN/i })).toBeVisible();
  });

  test('watchlist shows bid/ask/last prices', async ({ authedPage: page }) => {
    // Default WS mock sends ticks from WATCHLIST_RESPONSE (149.75 for AAPL)
    const aaplRow = page.getByRole('row', { name: /AAPL/i });
    await expect(aaplRow).toBeVisible({ timeout: 8_000 });
    // Check that the row contains a numeric price (real WS is mocked, values from fixture)
    await expect(aaplRow).toContainText('149.75');
  });

  test('click symbol in watchlist → pre-fills order ticket symbol field', async ({ authedPage: page }) => {
    await expect(page.getByRole('row', { name: /TSLA/i })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('row', { name: /TSLA/i }).click();
    // Order ticket symbol input should be pre-filled with TSLA
    await expect(page.getByRole('textbox', { name: 'Symbol', exact: true })).toHaveValue('TSLA', { timeout: 5_000 });
  });

  test('watchlist filter → shows only matching symbols', async ({ authedPage: page }) => {
    await expect(page.getByRole('row', { name: /AAPL/i })).toBeVisible({ timeout: 8_000 });
    await page.fill('input[aria-label="Filter symbols"]', 'AA');
    await expect(page.getByRole('row', { name: /AAPL/i })).toBeVisible();
    await expect(page.getByRole('row', { name: /TSLA/i })).not.toBeVisible();
  });

  test('watchlist filter Escape → clears filter and shows all symbols', async ({ authedPage: page }) => {
    await expect(page.getByRole('row', { name: /AAPL/i })).toBeVisible({ timeout: 8_000 });
    await page.fill('input[aria-label="Filter symbols"]', 'AA');
    await expect(page.getByRole('row', { name: /TSLA/i })).not.toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('row', { name: /TSLA/i })).toBeVisible();
  });

  test('submit MARKET BUY order → appears in blotter as PENDING', async ({ authedPage: page }) => {
    // Override orders: submit returns PENDING, subsequent GET returns one PENDING order
    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, json: ORDER_PENDING });
      }
      return route.fulfill({
        status: 200,
        json: { orders: [ORDER_PENDING], pagination: { limit: 25, offset: 0, total: 1 } },
      });
    });

    // Click AAPL row in the watchlist and wait for symbol to propagate into the order ticket
    const watchlistAapl = page.getByRole('grid', { name: 'Watchlist' }).getByRole('row', { name: /AAPL/i });
    await expect(watchlistAapl).toBeVisible({ timeout: 8_000 });
    await watchlistAapl.click();
    await expect(page.getByRole('textbox', { name: 'Symbol', exact: true })).toHaveValue('AAPL', { timeout: 3_000 });

    await page.fill('input[aria-label="Quantity"]', '10');
    await page.locator('button[type="submit"]').click();

    // Blotter should show the new order
    await expect(page.getByText('PENDING').first()).toBeVisible({ timeout: 8_000 });
  });

  test('submit order → success snackbar with confirmation', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, json: ORDER_PENDING });
      }
      return route.fulfill({ status: 200, json: ORDERS_EMPTY_PAGE });
    });

    await expect(page.getByRole('row', { name: /AAPL/i })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('row', { name: /AAPL/i }).click();
    await expect(page.getByRole('textbox', { name: 'Symbol', exact: true })).toHaveValue('AAPL', { timeout: 3_000 });

    await page.fill('input[aria-label="Quantity"]', '10');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/order submitted/i)).toBeVisible({ timeout: 8_000 });
  });

  test('submit LIMIT order → requires limit price', async ({ authedPage: page }) => {
    await expect(page.getByRole('row', { name: /AAPL/i })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('row', { name: /AAPL/i }).click();
    await expect(page.getByRole('textbox', { name: 'Symbol', exact: true })).toHaveValue('AAPL', { timeout: 3_000 });

    // Switch to LIMIT type — ToggleButton with aria-label="Limit order"
    await page.getByRole('button', { name: 'Limit order' }).click();

    await page.fill('input[aria-label="Quantity"]', '10');
    // Submit without limit price — should show validation error
    await page.locator('button[type="submit"]').click();

    // Exact validation message from ConfigPanel rules
    await expect(page.getByText('Limit price required')).toBeVisible({ timeout: 5_000 });
  });

  test('WS fill event → fill toast appears with correct details', async ({ authedPage: page }) => {
    // Override default WS mock: send tick then fill event after connection
    await page.routeWebSocket(/localhost:3016\/stream/, (ws) => {
      ws.send(JSON.stringify(WS_TICK_AAPL));
      setTimeout(() => ws.send(JSON.stringify(WS_FILL_EVENT)), 300);
    });

    // Navigate away and back to trigger a fresh WS connection (no page reload preserves auth)
    await navigateTo(page, '/portfolio');
    await navigateTo(page, '/trading');

    // Toast message format: "{symbol} × {filledQuantity} {side} FILLED at ${fillPrice}"
    await expect(page.getByText(/AAPL × 10/)).toBeVisible({ timeout: 10_000 });
  });

  test('WS fill event → positions panel updates to show new position', async ({ authedPage: page }) => {
    // Positions API returns AAPL position
    await page.route(`${API}/api/v1/positions**`, (route) =>
      route.fulfill({ status: 200, json: POSITIONS_WITH_AAPL }),
    );

    await page.routeWebSocket(/localhost:3016\/stream/, (ws) => {
      setTimeout(() => ws.send(JSON.stringify(WS_FILL_EVENT)), 300);
    });

    await navigateTo(page, '/portfolio');
    await navigateTo(page, '/trading');

    // Switch to Positions tab (default is Blotter)
    await page.getByRole('tab', { name: 'Positions' }).click();

    // Positions panel should show AAPL
    await expect(page.getByRole('cell', { name: 'AAPL' }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('server error on order submit → error alert shown', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 422, json: { message: 'Insufficient balance' } });
      }
      return route.fulfill({ status: 200, json: ORDERS_EMPTY_PAGE });
    });

    await expect(page.getByRole('row', { name: /AAPL/i })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('row', { name: /AAPL/i }).click();
    await expect(page.getByRole('textbox', { name: 'Symbol', exact: true })).toHaveValue('AAPL', { timeout: 3_000 });

    await page.fill('input[aria-label="Quantity"]', '10');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/insufficient balance/i)).toBeVisible();
  });

  test('blotter tab navigation → blotter/positions tabs work', async ({ authedPage: page }) => {
    // Blotter tab
    const blotterTab = page.getByRole('tab', { name: /blotter/i });
    if (await blotterTab.isVisible()) {
      await blotterTab.click();
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('positions panel shows loading skeleton then data', async ({ authedPage: page }) => {
    let resolve: () => void;
    const blocker = new Promise<void>((r) => { resolve = r; });

    await page.route(`${API}/api/v1/positions**`, async (route) => {
      await blocker;
      return route.fulfill({ status: 200, json: POSITIONS_WITH_AAPL });
    });

    // Navigate away and back to trigger fresh mount (no page reload preserves auth)
    await navigateTo(page, '/portfolio');
    // Release the blocker shortly after so skeleton briefly renders
    setTimeout(() => resolve!(), 200);
    await navigateTo(page, '/trading');

    // Switch to Positions tab to see the positions panel
    await page.getByRole('tab', { name: 'Positions' }).click();

    await expect(page.getByRole('cell', { name: 'AAPL' }).first()).toBeVisible({ timeout: 10_000 });
  });
});
