import { test, expect } from '../fixtures/index';

test.describe('AppShell Navigation', () => {
  test('tab bar is visible on trading page', async ({ authedPage: page }) => {
    // Already on /trading after authedPage fixture
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 8_000 });
  });

  test('navigate to Portfolio via tab → URL changes to /portfolio', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Portfolio' }).click();
    await page.waitForURL('**/portfolio', { timeout: 8_000 });
    await expect(page).toHaveURL(/\/portfolio/);
  });

  test('navigate to Orders via tab → URL changes to /orders', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Orders' }).click();
    await page.waitForURL('**/orders', { timeout: 8_000 });
    await expect(page).toHaveURL(/\/orders/);
  });

  test('navigate to Simulator via tab → URL changes to /simulator', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Simulator' }).click();
    await page.waitForURL('**/simulator', { timeout: 8_000 });
    await expect(page).toHaveURL(/\/simulator/);
  });

  test('navigate back to Trading via tab → URL changes to /trading', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Orders' }).click();
    await page.waitForURL('**/orders', { timeout: 8_000 });

    await page.getByRole('link', { name: 'Terminal' }).click();
    await page.waitForURL('**/trading', { timeout: 8_000 });
    await expect(page).toHaveURL(/\/trading/);
  });

  test('active tab is highlighted on /trading', async ({ authedPage: page }) => {
    // NavLink adds aria-current="page" when the route is active
    await expect(page.getByRole('link', { name: 'Terminal' })).toHaveAttribute('aria-current', 'page');
  });

  test('active tab is highlighted on /portfolio after navigation', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Portfolio' }).click();
    await page.waitForURL('**/portfolio', { timeout: 8_000 });

    // toHaveAttribute auto-retries until the NavLink updates aria-current
    await expect(page.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('aria-current', 'page');
  });

  test('Portfolio page heading visible after navigation', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Portfolio' }).click();
    await page.waitForURL('**/portfolio', { timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible({ timeout: 8_000 });
  });

  test('Orders page heading visible after navigation', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Orders' }).click();
    await page.waitForURL('**/orders', { timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible({ timeout: 8_000 });
  });

  test('full round-trip: Trading → Portfolio → Orders → Simulator → Trading', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Portfolio' }).click();
    await page.waitForURL('**/portfolio', { timeout: 8_000 });

    await page.getByRole('link', { name: 'Orders' }).click();
    await page.waitForURL('**/orders', { timeout: 8_000 });

    await page.getByRole('link', { name: 'Simulator' }).click();
    await page.waitForURL('**/simulator', { timeout: 8_000 });

    await page.getByRole('link', { name: 'Terminal' }).click();
    await page.waitForURL('**/trading', { timeout: 8_000 });

    await expect(page).toHaveURL(/\/trading/);
  });

  test('browser back button navigates back to previous page', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Portfolio' }).click();
    await page.waitForURL('**/portfolio', { timeout: 8_000 });

    await page.goBack();
    await page.waitForURL('**/trading', { timeout: 8_000 });
    await expect(page).toHaveURL(/\/trading/);
  });
});
