import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BlotterPanel } from './BlotterPanel';
import type { ApiClient, OrderResponseV1, OrdersPageV1 } from '../../api/client';

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

function makePage(orders: OrderResponseV1[] = SAMPLE_ORDERS, total?: number): OrdersPageV1 {
  return {
    orders,
    pagination: { limit: 50, offset: 0, total: total ?? orders.length },
  };
}

function makeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    submitOrder: vi.fn(),
    getOrders: vi.fn().mockResolvedValue(makePage()),
    getPositions: vi.fn().mockResolvedValue({ positions: [], totalUnrealizedPnl: 0, accountId: '', asOf: '' }),
    ...overrides,
  };
}

describe('BlotterPanel', () => {
  describe('when first mounted', () => {
    it('shows skeleton rows while loading', () => {
      const client = makeClient({ getOrders: vi.fn().mockReturnValue(new Promise(() => {})) });
      render(<BlotterPanel client={client} accountId="acc-001" />);
      const skeletonCells = document.querySelectorAll('.animate-pulse');
      expect(skeletonCells.length).toBeGreaterThan(0);
    });
  });

  describe('when orders load', () => {
    it('renders order rows with status chips', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<BlotterPanel client={makeClient()} accountId="acc-001" />);
      await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('FILLED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('applies green color to BUY side', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<BlotterPanel client={makeClient()} accountId="acc-001" />);
      await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
      expect(screen.getByText('BUY').className).toMatch(/text-green-400/);
    });

    it('applies red color to SELL side', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<BlotterPanel client={makeClient()} accountId="acc-001" />);
      await waitFor(() => expect(screen.getByText('MSFT')).toBeInTheDocument());
      expect(screen.getByText('SELL').className).toMatch(/text-red-400/);
    });

    it('shows "—" for MARKET orders with no limit price', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<BlotterPanel client={makeClient()} accountId="acc-001" />);
      await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe('status filter', () => {
    it('renders All | Pending | Filled | Cancelled | Rejected options', () => {
      render(<BlotterPanel client={makeClient()} accountId="acc-001" />);
      expect(screen.getByRole('radio', { name: 'All' })).toBeDefined();
      expect(screen.getByRole('radio', { name: 'Pending' })).toBeDefined();
      expect(screen.getByRole('radio', { name: 'Filled' })).toBeDefined();
      expect(screen.getByRole('radio', { name: 'Cancelled' })).toBeDefined();
      expect(screen.getByRole('radio', { name: 'Rejected' })).toBeDefined();
    });

    it('passes selected status to getOrders when filter is clicked', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const getOrders = vi.fn().mockResolvedValue(makePage([]));
      const client = makeClient({ getOrders });
      render(<BlotterPanel client={client} accountId="acc-001" />);
      // Wait for the initial poll to complete (fires on mount)
      await waitFor(() => expect(getOrders).toHaveBeenCalledTimes(1));
      // Click Filled filter
      fireEvent.click(screen.getByRole('radio', { name: 'Filled' }));
      // Advance past 5-second poll interval to trigger next fetch
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });
      expect(getOrders).toHaveBeenCalledWith(expect.objectContaining({ status: 'FILLED' }));
    });

    it('shows no-match message when filtered result is empty', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({ getOrders: vi.fn().mockResolvedValue(makePage([])) });
      render(<BlotterPanel client={client} accountId="acc-001" />);
      await waitFor(() =>
        expect(screen.getByText(/no orders matching filter/i)).toBeInTheDocument(),
      );
    });
  });

  describe('pagination', () => {
    it('shows Load more button when total > shown', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({ getOrders: vi.fn().mockResolvedValue(makePage(SAMPLE_ORDERS, 100)) });
      render(<BlotterPanel client={client} accountId="acc-001" />);
      await waitFor(() => expect(screen.getByText(/load more/i)).toBeInTheDocument());
    });

    it('hides Load more button when all orders are shown', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      render(<BlotterPanel client={makeClient()} accountId="acc-001" />);
      await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
      expect(screen.queryByText(/load more/i)).toBeNull();
    });
  });
});
