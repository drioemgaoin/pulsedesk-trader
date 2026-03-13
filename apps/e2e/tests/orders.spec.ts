import { test, expect, navigateTo } from '../fixtures/index';
import {
  ORDERS_EMPTY_PAGE,
  ORDERS_MIXED,
  ORDERS_ONE_FILLED,
  ORDER_PENDING,
  ORDER_FILLED,
} from '../fixtures/mock-data';

const API = 'http://localhost:3000';

test.describe('Orders', () => {
  test('navigate to /orders → orders table renders', async ({ authedPage: page }) => {
    await navigateTo(page, '/orders');
    await expect(page.getByRole('table', { name: /orders table/i })).toBeVisible({ timeout: 8_000 });
  });

  test('orders load and display symbol, side, status', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, json: ORDERS_MIXED });
      }
      return route.fallback();
    });

    await navigateTo(page, '/orders');

    await expect(page.getByRole('cell', { name: 'AAPL' }).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('FILLED').first()).toBeVisible();
    await expect(page.getByText('REJECTED').first()).toBeVisible();
    await expect(page.getByText('PENDING').first()).toBeVisible();
  });

  test('empty state → shows no-orders message', async ({ authedPage: page }) => {
    // Default mock returns empty orders
    await navigateTo(page, '/orders');

    await expect(page.getByText(/no orders match/i)).toBeVisible({ timeout: 8_000 });
  });

  test('filter to FILLED → shows only FILLED orders', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      if (status === 'FILLED') {
        return route.fulfill({ status: 200, json: ORDERS_ONE_FILLED });
      }
      return route.fulfill({ status: 200, json: ORDERS_MIXED });
    });

    await navigateTo(page, '/orders');
    await expect(page.getByText('REJECTED').first()).toBeVisible({ timeout: 8_000 });

    // Click FILLED chip in filter panel (sidebar on desktop)
    await page.getByRole('button', { name: 'FILLED', exact: true }).click();

    // After filter, only FILLED rows in the table (filter sidebar still shows chip labels)
    await expect(page.getByRole('table').getByText('FILLED').first()).toBeVisible({ timeout: 6_000 });
    await expect(page.getByRole('table').getByText('REJECTED')).not.toBeVisible();
    await expect(page.getByRole('table').getByText('PENDING')).not.toBeVisible();
  });

  test('filter to REJECTED → when none exist, shows empty state', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      if (status === 'REJECTED') {
        return route.fulfill({ status: 200, json: ORDERS_EMPTY_PAGE });
      }
      return route.fulfill({ status: 200, json: ORDERS_ONE_FILLED });
    });

    await navigateTo(page, '/orders');
    await expect(page.getByText('FILLED').first()).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: 'REJECTED', exact: true }).click();

    await expect(page.getByText(/no orders match/i)).toBeVisible({ timeout: 6_000 });
    await expect(page.getByRole('button', { name: /clear filters/i })).toBeVisible();
  });

  test('clear filters button → resets to all orders', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      return route.fulfill({
        status: 200,
        json: status ? ORDERS_EMPTY_PAGE : ORDERS_ONE_FILLED,
      });
    });

    await navigateTo(page, '/orders');
    await expect(page.getByText('FILLED').first()).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: 'FILLED', exact: true }).click();
    await expect(page.getByText(/no orders match/i)).toBeVisible({ timeout: 6_000 });

    await page.getByRole('button', { name: /clear filters/i }).click();

    await expect(page.getByText('FILLED').first()).toBeVisible({ timeout: 6_000 });
  });

  test('FILLED order → cancel button NOT present', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, json: ORDERS_ONE_FILLED });
      }
      return route.fallback();
    });

    await navigateTo(page, '/orders');
    await expect(page.getByRole('cell', { name: 'AAPL' })).toBeVisible({ timeout: 8_000 });

    await expect(page.getByRole('button', { name: /cancel order/i })).not.toBeVisible();
  });

  test('PENDING order → cancel button present → confirmation dialog', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          json: { orders: [ORDER_PENDING], pagination: { limit: 25, offset: 0, total: 1 } },
        });
      }
      return route.fallback();
    });

    await navigateTo(page, '/orders');
    await expect(page.getByRole('cell', { name: 'AAPL' })).toBeVisible({ timeout: 8_000 });

    // Cancel button should be visible for PENDING order
    const cancelBtn = page.getByRole('button', { name: new RegExp(`cancel order ${ORDER_PENDING.id}`, 'i') });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/cancel order for AAPL × 10/i)).toBeVisible();
  });

  test('cancel order confirmed → API called, order removed/updated', async ({ authedPage: page }) => {
    let cancelCalled = false;

    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          json: { orders: cancelCalled ? [] : [ORDER_PENDING], pagination: { limit: 25, offset: 0, total: cancelCalled ? 0 : 1 } },
        });
      }
      return route.fallback();
    });

    await page.route(`${API}/api/v1/orders/${ORDER_PENDING.id}/cancel`, (route) => {
      cancelCalled = true;
      return route.fulfill({ status: 200, json: { ...ORDER_PENDING, status: 'CANCELLED' } });
    });

    await navigateTo(page, '/orders');
    await expect(page.getByRole('cell', { name: 'AAPL' })).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: new RegExp(`cancel order ${ORDER_PENDING.id}`, 'i') }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /^cancel order$/i }).click();

    expect(cancelCalled).toBe(true);
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
  });

  test('cancel order dismissed → API NOT called', async ({ authedPage: page }) => {
    let cancelCalled = false;

    await page.route(`${API}/api/v1/orders**`, async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          json: { orders: [ORDER_PENDING], pagination: { limit: 25, offset: 0, total: 1 } },
        });
      }
      return route.fallback();
    });

    await page.route(`${API}/api/v1/orders/${ORDER_PENDING.id}/cancel`, (route) => {
      cancelCalled = true;
      return route.fulfill({ status: 200, json: {} });
    });

    await navigateTo(page, '/orders');
    await expect(page.getByRole('cell', { name: 'AAPL' })).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: new RegExp(`cancel order ${ORDER_PENDING.id}`, 'i') }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /keep/i }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 });
    expect(cancelCalled).toBe(false);
  });

  test('expand row → shows full order ID details', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, json: ORDERS_ONE_FILLED });
      }
      return route.fallback();
    });

    await navigateTo(page, '/orders');
    await expect(page.getByRole('cell', { name: 'AAPL' })).toBeVisible({ timeout: 8_000 });

    await page.getByLabel('expand row').first().click();

    // Full order ID should be visible in the expanded detail row
    await expect(page.getByText(ORDER_FILLED.id)).toBeVisible({ timeout: 5_000 });
  });

  test('pagination controls render when total > page size', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          json: { orders: [ORDER_FILLED], pagination: { limit: 25, offset: 0, total: 50 } },
        });
      }
      return route.fallback();
    });

    await navigateTo(page, '/orders');
    await expect(page.getByText(/50/)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /next page/i })).toBeVisible();
  });

  test('CSV export → downloads file', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, json: ORDERS_ONE_FILLED });
      }
      return route.fallback();
    });

    await navigateTo(page, '/orders');
    await expect(page.getByRole('cell', { name: 'AAPL' })).toBeVisible({ timeout: 8_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export orders as csv/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('API error → alert shown, no crash', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, (route) =>
      route.fulfill({ status: 500, json: { message: 'Internal server error' } }),
    );

    await navigateTo(page, '/orders');
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/failed to load orders/i)).toBeVisible();
  });
});
