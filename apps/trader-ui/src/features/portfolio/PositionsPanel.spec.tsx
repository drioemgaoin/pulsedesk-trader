import { render, screen, waitFor } from '@testing-library/react';
import { PositionsPanel } from './PositionsPanel';
import type { ApiClient, PositionsResponseV1 } from '../../api/client';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const POSITIVE_POSITIONS: PositionsResponseV1 = {
  accountId: 'acc-001',
  asOf: new Date().toISOString(),
  totalUnrealizedPnl: 500.5,
  positions: [
    {
      accountId: 'acc-001',
      symbol: 'AAPL',
      quantity: 10,
      averageCost: 150.0,
      marketPrice: 200.0,
      unrealizedPnl: 500.5,
      updatedAt: new Date().toISOString(),
    },
  ],
};

const NEGATIVE_POSITIONS: PositionsResponseV1 = {
  accountId: 'acc-001',
  asOf: new Date().toISOString(),
  totalUnrealizedPnl: -250.25,
  positions: [
    {
      accountId: 'acc-001',
      symbol: 'TSLA',
      quantity: 5,
      averageCost: 300.0,
      marketPrice: 250.0,
      unrealizedPnl: -250.25,
      updatedAt: new Date().toISOString(),
    },
  ],
};

function makeClient(response: PositionsResponseV1): ApiClient {
  return {
    submitOrder: vi.fn(),
    getOrders: vi.fn().mockResolvedValue([]),
    getPositions: vi.fn().mockResolvedValue(response),
  };
}

describe('Given positions are loading', () => {
  describe('when first mounted', () => {
    it('should show skeleton rows', () => {
      const client: ApiClient = {
        submitOrder: vi.fn(),
        getOrders: vi.fn().mockResolvedValue([]),
        getPositions: vi.fn().mockReturnValue(new Promise(() => {})),
      };
      render(<PositionsPanel client={client} accountId="acc-001" />);

      const skeletonCells = document.querySelectorAll('.animate-pulse');
      expect(skeletonCells.length).toBeGreaterThan(0);
    });
  });
});

describe('Given positions with positive PnL', () => {
  describe('when rendered', () => {
    it('should apply green color to PnL cell', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(POSITIVE_POSITIONS);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      const pnlCells = screen.getAllByLabelText(/Unrealized P&L: \+/i);
      expect(pnlCells[0].className).toMatch(/text-green-400/);
    });
  });
});

describe('Given positions with negative PnL', () => {
  describe('when rendered', () => {
    it('should apply red color to PnL cell', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(NEGATIVE_POSITIONS);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('TSLA')).toBeInTheDocument();
      });

      // Multiple cells may match — get all and check at least the first (row) is red
      const pnlCells = screen.getAllByLabelText(/Unrealized P&L: -/i);
      expect(pnlCells[0].className).toMatch(/text-red-400/);
    });
  });
});

describe('Given total PnL is positive', () => {
  describe('when rendered', () => {
    it('should show green total in footer', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(POSITIVE_POSITIONS);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Total Unrealized PnL/i)).toBeInTheDocument();
      });

      const totalCell = screen.getByLabelText('Total Unrealized P&L: +500.50');
      expect(totalCell.className).toMatch(/text-green-400/);
    });
  });
});
