/**
 * QA — PositionsPanel integration spec
 *
 * Scope  : PnL coloring for positive/negative values, total footer coloring,
 *          empty state, error state, and correct rendering of position data.
 * Style  : describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { PositionsPanel } from './PositionsPanel';
import type { ApiClient, PositionsResponseV1 } from '../../api/client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function buildPositionsResponse(
  overrides: Partial<PositionsResponseV1> = {},
): PositionsResponseV1 {
  return {
    accountId: 'acc-001',
    asOf: '2026-03-11T09:00:00.000Z',
    positions: [],
    totalUnrealizedPnl: 0,
    ...overrides,
  };
}

const POSITIVE_PNL_RESPONSE = buildPositionsResponse({
  totalUnrealizedPnl: 1250.75,
  positions: [
    {
      accountId: 'acc-001',
      symbol: 'AAPL',
      quantity: 100,
      averageCost: 150.0,
      marketPrice: 162.5,
      unrealizedPnl: 1250.75,
      updatedAt: '2026-03-11T09:00:00.000Z',
    },
  ],
});

const NEGATIVE_PNL_RESPONSE = buildPositionsResponse({
  totalUnrealizedPnl: -875.5,
  positions: [
    {
      accountId: 'acc-001',
      symbol: 'TSLA',
      quantity: 50,
      averageCost: 300.0,
      marketPrice: 282.49,
      unrealizedPnl: -875.5,
      updatedAt: '2026-03-11T09:00:00.000Z',
    },
  ],
});

const MIXED_PNL_RESPONSE = buildPositionsResponse({
  totalUnrealizedPnl: 375.25,
  positions: [
    {
      accountId: 'acc-001',
      symbol: 'AAPL',
      quantity: 10,
      averageCost: 150.0,
      marketPrice: 175.0,
      unrealizedPnl: 250.0,
      updatedAt: '2026-03-11T09:00:00.000Z',
    },
    {
      accountId: 'acc-001',
      symbol: 'TSLA',
      quantity: 5,
      averageCost: 300.0,
      marketPrice: 274.95,
      unrealizedPnl: -125.25,
      updatedAt: '2026-03-11T09:00:00.000Z',
    },
    {
      accountId: 'acc-001',
      symbol: 'MSFT',
      quantity: 15,
      averageCost: 400.0,
      marketPrice: 416.7,
      unrealizedPnl: 250.5,
      updatedAt: '2026-03-11T09:00:00.000Z',
    },
  ],
});

function makeClient(response: PositionsResponseV1): ApiClient {
  return {
    submitOrder: vi.fn(),
    getOrders: vi.fn().mockResolvedValue([]),
    getPositions: vi.fn().mockResolvedValue(response),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Positive PnL rendering
// ---------------------------------------------------------------------------

describe('PositionsPanel', () => {
  describe('when poll returns positions with positive unrealized PnL', () => {
    it('should render the PnL cell with green coloring', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(POSITIVE_PNL_RESPONSE);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      // getAllByLabelText because both row cell and footer cell carry the aria-label
      const pnlCells = screen.getAllByLabelText(/Unrealized P&L: \+/i);
      // The first match is always the row cell; footer is the last
      expect(pnlCells[0].className).toMatch(/text-green-400/);
    });

    it('should prefix positive PnL values with a plus sign', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(POSITIVE_PNL_RESPONSE);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      // The rendered value is split into two text nodes ("+" and "1,250.75")
      // so we query for the aria-label instead
      const pnlCells = screen.getAllByLabelText(/Unrealized P&L: \+1,250\.75/i);
      expect(pnlCells.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Negative PnL rendering
  // ---------------------------------------------------------------------------

  describe('when poll returns positions with negative unrealized PnL', () => {
    it('should render the PnL cell with red coloring', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(NEGATIVE_PNL_RESPONSE);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('TSLA')).toBeInTheDocument();
      });

      // getAllByLabelText: both row cell and footer cell carry the aria-label
      const pnlCells = screen.getAllByLabelText(/Unrealized P&L: -/i);
      expect(pnlCells[0].className).toMatch(/text-red-400/);
    });

    it('should not prefix negative PnL values with a plus sign', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(NEGATIVE_PNL_RESPONSE);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('TSLA')).toBeInTheDocument();
      });

      // Negative values start with minus sign, not plus
      expect(screen.queryByText(/^\+.*875/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Mixed positions: positive and negative PnL in same response
  // ---------------------------------------------------------------------------

  describe('when poll returns multiple positions with mixed PnL', () => {
    it('should color each PnL cell independently (green for positive, red for negative)', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(MIXED_PNL_RESPONSE);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });

      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();

      // getAllByLabelText includes both row cells and the footer cell.
      // 2 positive row cells (AAPL, MSFT) + 1 positive footer = 3 positive labels
      // 1 negative row cell (TSLA) + 1 negative footer = 2 negative labels
      const positiveCells = screen.getAllByLabelText(/Unrealized P&L: \+/i);
      const negativeCells = screen.getAllByLabelText(/Unrealized P&L: -/i);

      expect(positiveCells.length).toBeGreaterThanOrEqual(2);
      expect(negativeCells.length).toBeGreaterThanOrEqual(1);

      positiveCells.forEach((cell) => {
        expect(cell.className).toMatch(/text-green-400/);
      });
      negativeCells.forEach((cell) => {
        expect(cell.className).toMatch(/text-red-400/);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Total PnL footer
  // ---------------------------------------------------------------------------

  describe('when total unrealizedPnl is positive', () => {
    it('should render the footer total with green coloring', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(POSITIVE_PNL_RESPONSE);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Total Unrealized PnL/i)).toBeInTheDocument();
      });

      const totalCell = screen.getByLabelText(/Total Unrealized P&L: \+/i);
      expect(totalCell.className).toMatch(/text-green-400/);
    });
  });

  describe('when total unrealizedPnl is negative', () => {
    it('should render the footer total with red coloring', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(NEGATIVE_PNL_RESPONSE);
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Total Unrealized PnL/i)).toBeInTheDocument();
      });

      const totalCell = screen.getByLabelText(/Total Unrealized P&L: -/i);
      expect(totalCell.className).toMatch(/text-red-400/);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  describe('when poll returns an empty positions array', () => {
    it('should display the empty state message', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(buildPositionsResponse({ positions: [], totalUnrealizedPnl: 0 }));
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText(/no positions/i)).toBeInTheDocument();
      });
    });

    it('should not render the total PnL footer when there are no positions', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const client = makeClient(buildPositionsResponse({ positions: [], totalUnrealizedPnl: 0 }));
      render(<PositionsPanel client={client} accountId="acc-001" />);

      await waitFor(() => {
        expect(screen.getByText(/no positions/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Total Unrealized PnL/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  describe('when API throws on every poll attempt', () => {
    it('should show the error message after 3 consecutive failures', async () => {
      // Use real timers: the hook fires immediately on mount and schedules the
      // next poll 5 s later.  We advance through 3 timer ticks by advancing
      // fakeTimers in discrete steps to avoid the "10 000 timers" abort.
      vi.useFakeTimers({ shouldAdvanceTime: true });

      let callCount = 0;
      const client: ApiClient = {
        submitOrder: vi.fn(),
        getOrders: vi.fn().mockResolvedValue([]),
        getPositions: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.reject(new Error('Position service unavailable'));
        }),
      };
      const { unmount } = render(<PositionsPanel client={client} accountId="acc-001" />);

      // Tick 1 — fires on mount
      await act(async () => { await Promise.resolve(); });
      // Tick 2 — after 5 s poll interval
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });
      // Tick 3 — after another 5 s
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });

      await waitFor(() => {
        expect(screen.getByText(/failed to load positions/i)).toBeInTheDocument();
      });

      unmount();
    });

    it('should not render position rows when in error state', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const client: ApiClient = {
        submitOrder: vi.fn(),
        getOrders: vi.fn().mockResolvedValue([]),
        getPositions: vi.fn().mockRejectedValue(new Error('Position service unavailable')),
      };
      const { unmount } = render(<PositionsPanel client={client} accountId="acc-001" />);

      await act(async () => { await Promise.resolve(); });
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });
      await act(async () => { vi.advanceTimersByTime(5001); await Promise.resolve(); });

      await waitFor(() => {
        expect(screen.getByText(/failed to load positions/i)).toBeInTheDocument();
      });

      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();

      unmount();
    });
  });
});
