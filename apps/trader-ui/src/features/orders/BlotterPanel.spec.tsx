import { render, screen, waitFor } from '@testing-library/react';
import { BlotterPanel } from './BlotterPanel';
import type { ApiClient, OrderResponseV1 } from '../../api/client';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const SAMPLE_ORDERS: OrderResponseV1[] = [
  {
    orderId: 'ord-1',
    idempotencyKey: 'key-1',
    accountId: 'acc-001',
    symbol: 'AAPL',
    side: 'BUY',
    type: 'MARKET',
    quantity: 10,
    status: 'FILLED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    orderId: 'ord-2',
    idempotencyKey: 'key-2',
    accountId: 'acc-001',
    symbol: 'MSFT',
    side: 'SELL',
    type: 'LIMIT',
    quantity: 5,
    limitPrice: 300,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function makeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    submitOrder: vi.fn(),
    getOrders: vi.fn().mockResolvedValue(SAMPLE_ORDERS),
    getPositions: vi.fn().mockResolvedValue({ positions: [], totalUnrealizedPnl: 0, accountId: '', asOf: '' }),
    ...overrides,
  };
}

describe('Given orders are loading', () => {
  describe('when first mounted', () => {
    it('should show skeleton rows', () => {
      // Never resolves during this test
      const client = makeClient({
        getOrders: vi.fn().mockReturnValue(new Promise(() => {})),
      });
      render(<BlotterPanel client={client} accountId="acc-001" />);

      // Skeleton rows show animated pulse divs
      const skeletonCells = document.querySelectorAll('.animate-pulse');
      expect(skeletonCells.length).toBeGreaterThan(0);
    });
  });
});

describe('Given orders are returned', () => {
  describe('when poll resolves', () => {
    it('should render order rows with status chips', async () => {
      // Use a large interval so polling doesn't interfere with the test
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient();
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      expect(screen.getByText('MSFT')).toBeInTheDocument();

      // Status chips
      expect(screen.getByText('FILLED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });
  });
});

describe('Given a BUY order', () => {
  describe('when rendered', () => {
    it('should apply green color to side cell', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient();
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      const buyCell = screen.getAllByText('BUY')[0];
      expect(buyCell.className).toMatch(/text-green-400/);
    });
  });
});

describe('Given a SELL order', () => {
  describe('when rendered', () => {
    it('should apply red color to side cell', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient();
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('MSFT')).toBeInTheDocument();
      });

      const sellCell = screen.getAllByText('SELL')[0];
      expect(sellCell.className).toMatch(/text-red-400/);
    });
  });
});
