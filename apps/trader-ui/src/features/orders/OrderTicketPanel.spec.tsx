import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderTicketPanel } from './OrderTicketPanel';
import type { ApiClient } from '../../api/client';

function makeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    submitOrder: vi.fn().mockResolvedValue({ orderId: 'ord-1', status: 'PENDING' }),
    getOrders: vi.fn().mockResolvedValue([]),
    getPositions: vi.fn().mockResolvedValue({ positions: [], totalUnrealizedPnl: 0, accountId: '', asOf: '' }),
    ...overrides,
  };
}

async function fillMarketOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/symbol/i), 'AAPL');
  await user.tab(); // trigger onBlur uppercase normalize
  await user.type(screen.getByLabelText(/quantity/i), '10');
}

async function fillLimitOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/symbol/i), 'MSFT');
  await user.tab();
  await user.click(screen.getByRole('button', { name: /limit/i }));
  await user.type(screen.getByLabelText(/quantity/i), '5');
  // Do NOT fill limit price to trigger validation error
}

describe('Given a valid MARKET order form', () => {
  describe('when submitted', () => {
    it('should call submitOrder with correct payload', async () => {
      const client = makeClient();
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillMarketOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(client.submitOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: 'AAPL',
            side: 'BUY',
            type: 'MARKET',
            quantity: 10,
            accountId: 'acc-001',
          }),
        );
      });
    });
  });
});

describe('Given a LIMIT order with no limit price', () => {
  describe('when submitted', () => {
    it('should show validation error', async () => {
      const client = makeClient();
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillLimitOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      await waitFor(() => {
        expect(screen.getByText(/limit price required/i)).toBeInTheDocument();
      });
      expect(client.submitOrder).not.toHaveBeenCalled();
    });
  });
});

describe('Given submission in progress', () => {
  describe('when form is submitting', () => {
    it('should disable all inputs', async () => {
      let resolveSubmit!: () => void;
      const submitPromise = new Promise<{ orderId: string; status: string }>((res) => {
        resolveSubmit = () => res({ orderId: 'o1', status: 'PENDING' });
      });
      const client = makeClient({ submitOrder: vi.fn().mockReturnValue(submitPromise) });
      const user = userEvent.setup();
      render(<OrderTicketPanel client={client} accountId="acc-001" />);

      await fillMarketOrder(user);
      await user.click(screen.getByRole('button', { name: /submit order/i }));

      // While pending the submit button should show spinner text and be disabled
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
      });

      expect(screen.getByLabelText(/symbol/i)).toBeDisabled();
      expect(screen.getByLabelText(/quantity/i)).toBeDisabled();

      // Resolve to clean up
      resolveSubmit();
    });
  });
});

describe('Given a successful submission', () => {
  describe('when complete', () => {
    it('should reset the form', async () => {
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
  });
});
