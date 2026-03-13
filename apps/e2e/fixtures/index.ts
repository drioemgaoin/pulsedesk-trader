import { test as base, type Page, type Route } from '@playwright/test';
import {
  LOGIN_RESPONSE,
  WATCHLIST_RESPONSE,
  ORDERS_EMPTY_PAGE,
  POSITIONS_EMPTY,
  TEST_USERNAME,
  WS_MARKET_TICKS,
} from './mock-data';

const API = 'http://localhost:3000';

/**
 * Register default API mocks (auth, watchlist, orders, positions, WS).
 * Individual tests can override any route with `page.route()` before navigation.
 */
export async function setupDefaultMocks(page: Page) {
  // Auth — must match the actual endpoint the app calls (/api/v1/auth/token)
  await page.route(`${API}/api/v1/auth/token`, (route: Route) =>
    route.fulfill({ status: 200, json: LOGIN_RESPONSE }),
  );

  // Watchlist REST (snapshot)
  await page.route(`${API}/api/v1/watchlist**`, (route: Route) =>
    route.fulfill({ status: 200, json: WATCHLIST_RESPONSE }),
  );

  // Default WS mock: sends tick events for all 5 symbols so the watchlist is populated.
  // Tests that need custom WS behaviour (fill events) call page.routeWebSocket() after
  // this fixture runs — Playwright LIFO order means the test handler wins.
  await page.routeWebSocket(/localhost:3016\/stream/, (ws) => {
    WS_MARKET_TICKS.forEach((tick) => ws.send(JSON.stringify(tick)));
  });

  // Orders — default empty; tests override as needed
  await page.route(`${API}/api/v1/orders**`, (route: Route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: ORDERS_EMPTY_PAGE });
    }
    return route.fallback();
  });

  // Positions — default empty; tests override as needed
  await page.route(`${API}/api/v1/positions**`, (route: Route) =>
    route.fulfill({ status: 200, json: POSITIONS_EMPTY }),
  );
}

/**
 * Log in via the UI and wait until the trading terminal is visible.
 * Reusable across test files.
 */
export async function loginAndNavigate(page: Page) {
  await page.goto('/login');
  await page.fill('input[aria-label="Username"]', TEST_USERNAME);
  await page.fill('input[aria-label="Password"]', 'pulsedesk');
  await page.click('button[type="submit"]');
  // Wait until app shell navigation is visible (confirms successful auth + redirect)
  await page.waitForURL('**/trading', { timeout: 10_000 });
}

/** Labels used by AppShell NavLink for each protected route. */
const NAV_LABEL: Record<string, string> = {
  '/trading': 'Terminal',
  '/portfolio': 'Portfolio',
  '/orders': 'Orders',
  '/simulator': 'Simulator',
};

/**
 * SPA-navigate to a protected page by clicking the nav link.
 * This preserves Redux in-memory auth state (no full page reload).
 * Must be called from a page that already shows the AppShell (i.e. post-login).
 */
export async function navigateTo(page: Page, path: '/trading' | '/portfolio' | '/orders' | '/simulator') {
  const label = NAV_LABEL[path];
  if (!label) throw new Error(`Unknown path: ${path}`);
  await page.getByRole('link', { name: label }).click();
  await page.waitForURL(`**${path}`, { timeout: 8_000 });
}

// Extended test fixture — every test gets default mocks pre-installed
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await setupDefaultMocks(page);
    await loginAndNavigate(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
