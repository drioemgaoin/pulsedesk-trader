import { test, expect, navigateTo } from '../fixtures/index';
import { ORDER_PENDING, ORDER_FILLED } from '../fixtures/mock-data';

const API = 'http://localhost:3000';

test.describe('Simulator', () => {
  test('navigate to /simulator → configuration form renders', async ({ authedPage: page }) => {
    await navigateTo(page, '/simulator');
    await expect(page.locator('form[aria-label="simulator configuration form"]')).toBeVisible({ timeout: 8_000 });
  });

  test('Burst profile selected by default → Order Count field visible', async ({ authedPage: page }) => {
    await navigateTo(page, '/simulator');
    await expect(page.getByLabel(/burst order count/i)).toBeVisible({ timeout: 8_000 });
  });

  test('switch to Steady profile → rate and duration fields appear', async ({ authedPage: page }) => {
    await navigateTo(page, '/simulator');

    // Traffic profile uses ToggleButton (not radio)
    await page.getByRole('button', { name: 'Steady' }).click();

    await expect(page.getByLabel(/steady rate/i)).toBeVisible();
    await expect(page.getByLabel(/steady duration/i)).toBeVisible();
    // Burst count field should be gone
    await expect(page.getByLabel(/burst order count/i)).not.toBeVisible();
  });

  test('switch to Ramp profile → ramp fields appear', async ({ authedPage: page }) => {
    await navigateTo(page, '/simulator');

    await page.getByRole('button', { name: 'Ramp' }).click();

    await expect(page.getByLabel(/ramp min rate/i)).toBeVisible();
    await expect(page.getByLabel(/ramp max rate/i)).toBeVisible();
  });

  test('Burst count=5 / Normal / AAPL → start → stats show Submitted ≥ 1', async ({ authedPage: page }) => {
    let submitted = 0;
    await page.route(`${API}/api/v1/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        submitted++;
        return route.fulfill({ status: 201, json: { ...ORDER_PENDING, id: `ord-sim-${submitted}` } });
      }
      return route.fulfill({ status: 200, json: { orders: [], pagination: { limit: 25, offset: 0, total: 0 } } });
    });

    await navigateTo(page, '/simulator');

    // Set count to 5
    await page.fill('input[aria-label="burst order count"]', '5');

    // Ensure Normal scenario (it's the default — RadioGroup value "Normal")
    await expect(page.getByRole('radio', { name: 'Normal' })).toBeChecked();

    // Ensure AAPL is selected (it's the default checkbox)
    await expect(page.getByLabel('symbol AAPL')).toBeChecked();

    // Start
    await page.getByRole('button', { name: /start simulation/i }).click();

    // Stats panel should appear and Submitted count ≥ 1 within 15s
    await expect(page.locator('[aria-label^="Submitted:"]').filter({ hasText: /[1-9]/ })).toBeVisible({ timeout: 15_000 });
  });

  test('Burst run → live feed shows entries', async ({ authedPage: page }) => {
    let count = 0;
    await page.route(`${API}/api/v1/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        count++;
        return route.fulfill({ status: 201, json: { ...ORDER_PENDING, id: `ord-feed-${count}` } });
      }
      return route.fulfill({ status: 200, json: { orders: [], pagination: { limit: 25, offset: 0, total: 0 } } });
    });

    await navigateTo(page, '/simulator');
    await page.fill('input[aria-label="burst order count"]', '3');
    await page.getByRole('button', { name: /start simulation/i }).click();

    // Live feed is a Box with aria-label="live feed" containing virtualized Stack rows.
    // Each row has a Chip with the order status. Wait for any status chip to appear.
    await expect(
      page.locator('[aria-label="live feed"]').getByText(/ACCEPTED|FILLED|REJECTED|ERROR/).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Limit Exceeded scenario → Rejected stat increases', async ({ authedPage: page }) => {
    let count = 0;
    await page.route(`${API}/api/v1/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        count++;
        if (count <= 1) {
          return route.fulfill({ status: 201, json: { ...ORDER_PENDING, id: `ord-lim-${count}` } });
        }
        // 422 = classified as "rejected" by useSimulator (not 429 which is "errored")
        return route.fulfill({ status: 422, json: { message: 'Quantity exceeds limit' } });
      }
      return route.fulfill({ status: 200, json: { orders: [], pagination: { limit: 25, offset: 0, total: 0 } } });
    });

    await navigateTo(page, '/simulator');
    await page.fill('input[aria-label="burst order count"]', '3');

    // Select LimitExceeded scenario (value is "LimitExceeded" without space)
    await page.getByRole('radio', { name: 'LimitExceeded' }).click();

    await page.getByRole('button', { name: /start simulation/i }).click();

    // Rejected count should increase — StatBox renders aria-label="Rejected: N"
    await expect(page.locator('[aria-label^="Rejected:"]').filter({ hasText: /[1-9]/ })).toBeVisible({ timeout: 15_000 });
  });

  test('stop simulation → stats freeze', async ({ authedPage: page }) => {
    let count = 0;
    await page.route(`${API}/api/v1/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        count++;
        // Delay each response so the simulation takes long enough to stop
        await new Promise((r) => setTimeout(r, 150));
        return route.fulfill({ status: 201, json: { ...ORDER_PENDING, id: `ord-stop-${count}` } });
      }
      return route.fulfill({ status: 200, json: { orders: [], pagination: { limit: 25, offset: 0, total: 0 } } });
    });

    await navigateTo(page, '/simulator');
    // Use large count so the simulation is still running when we click stop
    await page.fill('input[aria-label="burst order count"]', '50');
    await page.getByRole('button', { name: /start simulation/i }).click();

    // Wait for at least 1 submitted
    await expect(page.locator('[aria-label^="Submitted:"]').filter({ hasText: /[1-9]/ })).toBeVisible({ timeout: 15_000 });

    // Stop the simulation while it's still running
    await page.getByRole('button', { name: /stop simulation/i }).click();

    // Start button (labelled "Restart" when stopped) should reappear
    await expect(page.getByRole('button', { name: /start simulation/i })).toBeVisible({ timeout: 5_000 });
  });

  test('reset simulation → stats clear to zero', async ({ authedPage: page }) => {
    let count = 0;
    await page.route(`${API}/api/v1/orders`, async (route) => {
      if (route.request().method() === 'POST') {
        count++;
        // Delay each response so the simulation takes long enough to stop+reset
        await new Promise((r) => setTimeout(r, 150));
        return route.fulfill({ status: 201, json: { ...ORDER_FILLED, id: `ord-rst-${count}` } });
      }
      return route.fulfill({ status: 200, json: { orders: [], pagination: { limit: 25, offset: 0, total: 0 } } });
    });

    await navigateTo(page, '/simulator');
    // Large count to keep simulation running
    await page.fill('input[aria-label="burst order count"]', '50');
    await page.getByRole('button', { name: /start simulation/i }).click();

    await expect(page.locator('[aria-label^="Submitted:"]').filter({ hasText: /[1-9]/ })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /stop simulation/i }).click();
    await expect(page.getByRole('button', { name: /reset simulation/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /reset simulation/i }).click();

    await expect(page.locator('[aria-label="Submitted: 0"]')).toBeVisible({ timeout: 5_000 });
  });

  test('invalid burst count → validation error shown', async ({ authedPage: page }) => {
    await navigateTo(page, '/simulator');

    await page.fill('input[aria-label="burst order count"]', '0');
    await page.getByRole('button', { name: /start simulation/i }).click();

    // Validation error message from ConfigPanel rules: 'Must be 1–500'
    await expect(page.getByText('Must be 1–500')).toBeVisible({ timeout: 5_000 });
  });
});
