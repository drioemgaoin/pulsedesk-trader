import { test, expect, navigateTo } from '../fixtures/index';
import { test as baseTest } from '@playwright/test';
import { setupDefaultMocks } from '../fixtures/index';
import { POSITIONS_WITH_AAPL, ORDERS_MIXED } from '../fixtures/mock-data';
import AxeBuilder from '@axe-core/playwright';

const API = 'http://localhost:3000';

test.describe('Accessibility — authed pages', () => {
  test('Trading Terminal (/trading) has no critical violations', async ({ authedPage: page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(
      critical,
      `Critical a11y violations on /trading:\n${critical.map((v) => `  [${v.id}] ${v.description}`).join('\n')}`,
    ).toHaveLength(0);
  });

  test('Portfolio (/portfolio) has no critical violations', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/positions**`, (route) =>
      route.fulfill({ status: 200, json: POSITIONS_WITH_AAPL }),
    );

    await navigateTo(page, '/portfolio');
    await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible({ timeout: 8_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(
      critical,
      `Critical a11y violations on /portfolio:\n${critical.map((v) => `  [${v.id}] ${v.description}`).join('\n')}`,
    ).toHaveLength(0);
  });

  test('Orders (/orders) has no critical violations', async ({ authedPage: page }) => {
    await page.route(`${API}/api/v1/orders**`, (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, json: ORDERS_MIXED });
      }
      return route.fallback();
    });

    await navigateTo(page, '/orders');
    await expect(page.getByRole('table', { name: /orders table/i })).toBeVisible({ timeout: 8_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(
      critical,
      `Critical a11y violations on /orders:\n${critical.map((v) => `  [${v.id}] ${v.description}`).join('\n')}`,
    ).toHaveLength(0);
  });

  test('Simulator (/simulator) has no critical violations', async ({ authedPage: page }) => {
    await navigateTo(page, '/simulator');
    await expect(page.locator('form[aria-label="simulator configuration form"]')).toBeVisible({ timeout: 8_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(
      critical,
      `Critical a11y violations on /simulator:\n${critical.map((v) => `  [${v.id}] ${v.description}`).join('\n')}`,
    ).toHaveLength(0);
  });
});

test.describe('Accessibility — login page', () => {
  baseTest('Login (/login) has no critical violations', async ({ page }) => {
    await setupDefaultMocks(page);
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(
      critical,
      `Critical a11y violations on /login:\n${critical.map((v) => `  [${v.id}] ${v.description}`).join('\n')}`,
    ).toHaveLength(0);
  });

  baseTest('Login form fields have labels', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});
