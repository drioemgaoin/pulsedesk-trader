/**
 * QA — OrderTicketPanel integration spec
 *
 * Scope  : LIMIT/MARKET field visibility, API rejection message display,
 *          form reset on successful submission, error propagation.
 * Style  : describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderTicketPanel } from './OrderTicketPanel';
import type { ApiClient } from '../../api/client';
import { ApiError } from '../../api/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    submitOrder: vi.fn().mockResolvedValue({
      orderId: 'ord-new',
      idempotencyKey: 'key-new',
      accountId: 'acc-001',
      symbol: 'AAPL',
      side: 'BUY',
      type: 'MARKET',
      quantity: 10,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getOrders: vi.fn().mockResolvedValue([]),
    getPositions: vi.fn().mockResolvedValue({
      positions: [],
      totalUnrealizedPnl: 0,
      accountId: '',
      asOf: '',
    }),
    ...overrides,
  };
}

/** Fill symbol and quantity for a MARKET order (default form state). */
async function fillMarketOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/symbol/i), 'AAPL');
  await user.tab(); // trigger onBlur uppercase normalization
  await user.type(screen.getByLabelText(/quantity/i), '10');
}

/** Switch to LIMIT and fill all required fields. */
async function fillLimitOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/symbol/i), 'MSFT');
  await user.tab();
  await user.click(screen.getByRole('button', { name: /^limit$/i }));
  await user.type(screen.getByLabelText(/quantity/i), '5');
  await user.type(screen.getByLabelText(/limit price/i), '300');
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// LIMIT / MARKET field visibility
// ---------------------------------------------------------------------------

describe('OrderTicketPanel', () => {
  describe('when LIMIT order type is selected', () => {
    it('should show the limit price input field', async () => {
      const user = userEvent.setup();
      render(<OrderTicketPanel client={makeClient()} accountId="acc-001" />);

      await user.click(screen.getByRole('button', { name: /^limit$/i }));

      expect(screen.getByLabelText(/limit price/i)).toBeInTheDocument();
    });

    it('should require a limit price value before enabling submission', async () => {
      const client = makeClient();
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      // Switch to LIMIT, fill symbol and quantity but omit limit price
      await user.type(screen.getByLabelText(/symbol/i), 'MSFT');
      await user.tab();
      await user.click(screen.getByRole('button', { name: /^limit$/i }));
      await user.type(screen.getByLabelText(/quantity/i), '5');
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(screen.getByText(/limit price required/i)).toBeInTheDocument();
      });

      expect(client.submitOrder).not.toHaveBeenCalled();
    });
  });

  describe('when MARKET order type is selected', () => {
    it('should not show the limit price input field', () => {
      render(<OrderTicketPanel client={makeClient()} accountId="acc-001" />);

      // Default is MARKET — limit price field should be absent
      expect(screen.queryByLabelText(/limit price/i)).not.toBeInTheDocument();
    });

    it('should hide the limit price field after switching from LIMIT to MARKET', async () => {
      const user = userEvent.setup();
      render(<OrderTicketPanel client={makeClient()} accountId="acc-001" />);

      // Switch to LIMIT first
      await user.click(screen.getByRole('button', { name: /^limit$/i }));
      expect(screen.getByLabelText(/limit price/i)).toBeInTheDocument();

      // Switch back to MARKET
      await user.click(screen.getByRole('button', { name: /^market$/i }));
      expect(screen.queryByLabelText(/limit price/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // API rejection reason display
  // ---------------------------------------------------------------------------

  describe('when the API returns a rejection with an error message', () => {
    it('should display the rejection message to the user', async () => {
      const client = makeClient({
        submitOrder: vi.fn().mockRejectedValue(
          new ApiError(422, 'Risk limit exceeded for account'),
        ),
      });
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillMarketOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/risk limit exceeded for account/i),
        ).toBeInTheDocument();
      });
    });

    it('should show a fallback error message when the thrown value is not an Error instance', async () => {
      // When a non-Error value is thrown (e.g. a plain string), the component
      // falls back to 'Request failed — try again'.
      const client = makeClient({
        submitOrder: vi.fn().mockRejectedValue('unexpected rejection'),
      });
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillMarketOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(screen.getByText(/request failed — try again/i)).toBeInTheDocument();
      });
    });

    it('should not reset the form when submission fails', async () => {
      const client = makeClient({
        submitOrder: vi.fn().mockRejectedValue(
          new ApiError(503, 'Service unavailable'),
        ),
      });
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillMarketOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
      });

      // Symbol should still be populated after failure
      expect(screen.getByLabelText(/symbol/i)).toHaveValue('AAPL');
    });
  });

  // ---------------------------------------------------------------------------
  // Form reset on successful submission
  // ---------------------------------------------------------------------------

  describe('when a MARKET order submission succeeds', () => {
    it('should reset the symbol field to empty', async () => {
      const client = makeClient();
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillMarketOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/symbol/i)).toHaveValue('');
      });
    });

    it('should reset the quantity field to empty', async () => {
      const client = makeClient();
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillMarketOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/symbol/i)).toHaveValue('');
      });

      expect(screen.getByLabelText(/quantity/i)).toHaveValue(null);
    });

    it('should reset to MARKET type after a LIMIT order submission succeeds', async () => {
      const client = makeClient();
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillLimitOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/symbol/i)).toHaveValue('');
      });

      // After reset, the limit price field should no longer be visible
      expect(screen.queryByLabelText(/limit price/i)).not.toBeInTheDocument();
    });

    it('should clear any previous error message on a new successful submission', async () => {
      // First submit fails, second succeeds
      let callCount = 0;
      const client = makeClient({
        submitOrder: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            throw new ApiError(422, 'Risk check failed');
          }
          return {
            orderId: 'ord-2',
            idempotencyKey: 'key-2',
            accountId: 'acc-001',
            symbol: 'AAPL',
            side: 'BUY',
            type: 'MARKET',
            quantity: 10,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }),
      });
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      // First attempt — fails
      await fillMarketOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));
      await waitFor(() => {
        expect(screen.getByText(/risk check failed/i)).toBeInTheDocument();
      });

      // Re-fill and submit again — succeeds
      await user.type(screen.getByLabelText(/symbol/i), 'AAPL');
      await user.tab();
      await user.type(screen.getByLabelText(/quantity/i), '10');
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/symbol/i)).toHaveValue('');
      });

      expect(screen.queryByText(/risk check failed/i)).not.toBeInTheDocument();
    });
  });
});
