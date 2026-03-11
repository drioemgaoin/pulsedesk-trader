/**
 * QA — BlotterPanel integration spec
 *
 * Scope  : Multi-order rendering, empty state, error state, stale state,
 *          status chip semantic coloring, column value correctness.
 * Style  : describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 * Notes  : Uses fake timers only where timer interaction is needed to avoid
 *          flakiness from the 5-second poll interval.
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { BlotterPanel } from './BlotterPanel';
import type { ApiClient, OrderResponseV1, OrdersPageV1 } from '../../api/client';

function makePage(orders: OrderResponseV1[], total?: number): OrdersPageV1 {
  return { orders, pagination: { limit: 50, offset: 0, total: total ?? orders.length } };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_TIME = '2026-03-11T09:00:00.000Z';

function buildOrder(overrides: Partial<OrderResponseV1> = {}): OrderResponseV1 {
  return {
    orderId: 'ord-fixture-1',
    idempotencyKey: 'key-fixture-1',
    accountId: 'acc-001',
    symbol: 'AAPL',
    side: 'BUY',
    type: 'MARKET',
    quantity: 10,
    status: 'FILLED',
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
  };
}

const MULTI_ORDER_RESPONSE: OrderResponseV1[] = [
  buildOrder({
    orderId: 'ord-1',
    symbol: 'AAPL',
    side: 'BUY',
    type: 'MARKET',
    quantity: 10,
    status: 'FILLED',
  }),
  buildOrder({
    orderId: 'ord-2',
    symbol: 'MSFT',
    side: 'SELL',
    type: 'LIMIT',
    quantity: 5,
    limitPrice: 300,
    status: 'PENDING',
  }),
  buildOrder({
    orderId: 'ord-3',
    symbol: 'GOOGL',
    side: 'BUY',
    type: 'LIMIT',
    quantity: 2,
    limitPrice: 175.5,
    status: 'ACCEPTED',
  }),
  buildOrder({
    orderId: 'ord-4',
    symbol: 'TSLA',
    side: 'SELL',
    type: 'MARKET',
    quantity: 1,
    status: 'REJECTED',
  }),
  buildOrder({
    orderId: 'ord-5',
    symbol: 'AMZN',
    side: 'BUY',
    type: 'LIMIT',
    quantity: 3,
    limitPrice: 190,
    status: 'CANCELLED',
  }),
];

function makeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    submitOrder: vi.fn(),
    getOrders: vi.fn().mockResolvedValue(makePage(MULTI_ORDER_RESPONSE)),
    getPositions: vi.fn().mockResolvedValue({
      positions: [],
      totalUnrealizedPnl: 0,
      accountId: '',
      asOf: '',
    }),
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Multi-order rendering — column values
// ---------------------------------------------------------------------------

describe('BlotterPanel', () => {
  describe('when poll returns multiple orders', () => {
    it('should render a row for each order with correct symbol values', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient();
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.getByText('AMZN')).toBeInTheDocument();
    });

    it('should render correct quantity values in each row', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient();
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      // Quantities 10, 5, 2, 1, 3 — rendered as text
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render limit price formatted to two decimals for LIMIT orders', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient();
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('MSFT')).toBeInTheDocument();
      });

      // 300 → "300.00", 175.5 → "175.50", 190 → "190.00"
      expect(screen.getByText('300.00')).toBeInTheDocument();
      expect(screen.getByText('175.50')).toBeInTheDocument();
      expect(screen.getByText('190.00')).toBeInTheDocument();
    });

    it('should render em-dash for limit price when order type is MARKET', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient();
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      // AAPL (MARKET) and TSLA (MARKET) each show '—'
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe('when poll returns an empty orders array', () => {
    it('should show the empty state message', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({ getOrders: vi.fn().mockResolvedValue(makePage([])) });
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText(/no orders matching filter/i)).toBeInTheDocument();
      });
    });

    it('should not render any data rows', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({ getOrders: vi.fn().mockResolvedValue(makePage([])) });
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText(/no orders matching filter/i)).toBeInTheDocument();
      });

      // None of the symbol column values that would indicate a real row
      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Error state — 3 consecutive failures
  // ---------------------------------------------------------------------------

  describe('when API throws on every poll attempt', () => {
    it('should show the error message after 3 consecutive failures', async () => {
      // Advance timer in discrete steps: hook fires on mount, then after each
      // 5-second interval.  Avoid runAllTimersAsync which hits the 10 000-timer abort.
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({
        getOrders: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      const { unmount } = render(<BlotterPanel client={client} accountId="acc-001" />);

      // Poll 1 — fires on mount
      await act(async () => { await Promise.resolve(); });
      // Poll 2 — after 5 s
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });
      // Poll 3 — after another 5 s
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });

      await waitFor(() => {
        expect(screen.getByText(/failed to load orders/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should not render order rows when in error state', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({
        getOrders: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      const { unmount } = render(<BlotterPanel client={client} accountId="acc-001" />);

      await act(async () => { await Promise.resolve(); });
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });

      await waitFor(() => {
        expect(screen.getByText(/failed to load orders/i)).toBeInTheDocument();
      });

      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();

      unmount();
    });
  });

  // ---------------------------------------------------------------------------
  // Stale state — successful data followed by failed polls past 15s threshold
  // ---------------------------------------------------------------------------

  describe('when data goes stale after the 15-second threshold', () => {
    it('should show the stale warning badge', async () => {
      // The stale condition is set when:
      //   consecutiveFailures >= 1 AND consecutiveFailures < 3 AND
      //   Date.now() - lastUpdated > 15 000 ms
      //
      // With a 5 s interval, re-polls occur at T+5 s (age 5 s, not stale),
      // T+10 s (age 10 s, not stale), T+15 s (age 15 s, NOT > 15 s, not stale).
      //
      // To trigger stale we need a single large time gap between the successful
      // poll and the next failure.  We achieve this by:
      //  1. Letting poll-1 succeed at T=0
      //  2. Advancing time 20 s in one act() so poll-2 fires at T+5 s (age 5 s)
      //     AND poll-3 fires at T+10 s (age 10 s).  Both are failures 1 & 2.
      //
      // That still doesn't exceed 15 s.  The only way to reach stale with the
      // current BlotterPanel (fixed 5 s interval) is to advance time such that
      // a poll fires more than 15 s after the last success.
      //
      // The HIDDEN_INTERVAL_MS = 15 000 ms kicks in when the page is hidden.
      // We simulate that: set document.visibilityState = 'hidden' after poll-1
      // so the next poll is scheduled for 15 s later.  Then advance 15 001 ms
      // so the hidden-interval poll fires at age = 15 001 ms > 15 000 ms → stale
      // (failure-1, consecutiveFailures = 1 < 3).

      vi.useFakeTimers({ shouldAdvanceTime: true });

      // Simulate page visibility transition
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });

      let callCount = 0;
      const client = makeClient({
        getOrders: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) return makePage([buildOrder({ symbol: 'AAPL' })]);
          throw new Error('service unavailable');
        }),
      });

      const { unmount } = render(<BlotterPanel client={client} accountId="acc-001" />);

      // Poll 1 succeeds (fires on mount)
      await act(async () => { await Promise.resolve(); });
      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      // Simulate tab going hidden so scheduleNext() uses HIDDEN_INTERVAL_MS = 15 s
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });

      // Advance 15 001 ms: the 15-second hidden-interval timer fires → poll 2
      // Age = 15 001 ms > 15 000 ms, consecutiveFailures becomes 1 (< 3) → stale
      await act(async () => {
        vi.advanceTimersByTime(15001);
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByText(/stale/i)).toBeInTheDocument();
      });

      unmount();

      // Restore visibility
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Status chip semantic coloring
  // ---------------------------------------------------------------------------

  describe('when an order has status PENDING', () => {
    it('should render the status chip with gray styling', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({
        getOrders: vi.fn().mockResolvedValue(makePage([
          buildOrder({ orderId: 'ord-p', status: 'PENDING' }),
        ])),
      });
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('PENDING')).toBeInTheDocument();
      });

      const chip = screen.getByText('PENDING');
      expect(chip.className).toMatch(/bg-zinc-800/);
      expect(chip.className).toMatch(/text-zinc-400/);
    });
  });

  describe('when an order has status ACCEPTED', () => {
    it('should render the status chip with blue styling', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({
        getOrders: vi.fn().mockResolvedValue(makePage([
          buildOrder({ orderId: 'ord-a', status: 'ACCEPTED' }),
        ])),
      });
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
      });

      const chip = screen.getByText('ACCEPTED');
      expect(chip.className).toMatch(/bg-blue-900/);
      expect(chip.className).toMatch(/text-blue-400/);
    });
  });

  describe('when an order has status FILLED', () => {
    it('should render the status chip with green styling', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({
        getOrders: vi.fn().mockResolvedValue(makePage([
          buildOrder({ orderId: 'ord-f', status: 'FILLED' }),
        ])),
      });
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('FILLED')).toBeInTheDocument();
      });

      const chip = screen.getByText('FILLED');
      expect(chip.className).toMatch(/bg-green-900/);
      expect(chip.className).toMatch(/text-green-400/);
    });
  });

  describe('when an order has status REJECTED', () => {
    it('should render the status chip with red styling', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({
        getOrders: vi.fn().mockResolvedValue(makePage([
          buildOrder({ orderId: 'ord-r', status: 'REJECTED' }),
        ])),
      });
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('REJECTED')).toBeInTheDocument();
      });

      const chip = screen.getByText('REJECTED');
      expect(chip.className).toMatch(/bg-red-900/);
      expect(chip.className).toMatch(/text-red-400/);
    });
  });

  describe('when an order has status CANCELLED', () => {
    it('should render the status chip with gray styling', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient({
        getOrders: vi.fn().mockResolvedValue(makePage([
          buildOrder({ orderId: 'ord-c', status: 'CANCELLED' }),
        ])),
      });
      render(<BlotterPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('CANCELLED')).toBeInTheDocument();
      });

      const chip = screen.getByText('CANCELLED');
      expect(chip.className).toMatch(/bg-zinc-800/);
      expect(chip.className).toMatch(/text-zinc-400/);
    });
  });
});
