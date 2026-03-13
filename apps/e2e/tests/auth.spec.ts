import { test, expect } from '@playwright/test';
import { setupDefaultMocks } from '../fixtures/index';
import { LOGIN_RESPONSE } from '../fixtures/mock-data';

const API = 'http://localhost:3000';

test.describe('Authentication', () => {
  test('valid credentials → redirected to /trading', async ({ page }) => {
    await setupDefaultMocks(page);
    await page.goto('/login');

    await page.fill('input[aria-label="Username"]', 'trader');
    await page.fill('input[aria-label="Password"]', 'pulsedesk');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/trading', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/trading/);
  });

  test('invalid credentials → error alert shown, stays on /login', async ({ page }) => {
    await page.route(`${API}/api/v1/auth/login`, (route) =>
      route.fulfill({ status: 401, json: { message: 'Invalid credentials' } }),
    );

    await page.goto('/login');
    await page.fill('input[aria-label="Username"]', 'wrong');
    await page.fill('input[aria-label="Password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/invalid credentials/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('blank username → inline validation error, no API call', async ({ page }) => {
    let loginCalled = false;
    await page.route(`${API}/api/v1/auth/login`, (route) => {
      loginCalled = true;
      return route.fulfill({ status: 200, json: LOGIN_RESPONSE });
    });

    await page.goto('/login');
    await page.fill('input[aria-label="Password"]', 'pulsedesk');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/username is required/i)).toBeVisible();
    expect(loginCalled).toBe(false);
  });

  test('blank password → inline validation error, no API call', async ({ page }) => {
    let loginCalled = false;
    await page.route(`${API}/api/v1/auth/login`, (route) => {
      loginCalled = true;
      return route.fulfill({ status: 200, json: LOGIN_RESPONSE });
    });

    await page.goto('/login');
    await page.fill('input[aria-label="Username"]', 'trader');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/password is required/i)).toBeVisible();
    expect(loginCalled).toBe(false);
  });

  test('direct navigation to /trading without token → redirect to /login', async ({ page }) => {
    // No mocks — no auth token in store
    await page.goto('/trading');
    await expect(page).toHaveURL(/\/login/);
  });

  test('direct navigation to /portfolio without token → redirect to /login', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page).toHaveURL(/\/login/);
  });

  test('direct navigation to /orders without token → redirect to /login', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('direct navigation to /simulator without token → redirect to /login', async ({ page }) => {
    await page.goto('/simulator');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unknown route → 404 page', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  test('session expired query param → warning banner on login page', async ({ page }) => {
    await page.goto('/login?reason=session_expired');
    await expect(page.getByText(/session expired/i)).toBeVisible();
  });
});
