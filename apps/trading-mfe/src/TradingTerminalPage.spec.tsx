import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils/renderWithProviders';
import TradingTerminalPage from './TradingTerminalPage';
import type { FillEvent, UseMarketStreamResult } from './hooks/useMarketStream';

// ── Mock child panels to keep tests focused ─────────────────────────────────
vi.mock('./components/WatchlistPanel', () => ({
  WatchlistPanel: () => <div data-testid="watchlist" />,
}));
vi.mock('./components/ChartPanel', () => ({
  ChartPanel: () => <div data-testid="chart" />,
}));
vi.mock('./components/OrderTicketPanel', () => ({
  OrderTicketPanel: () => <div data-testid="order-ticket" />,
}));
vi.mock('./components/BlotterPanel', () => ({
  BlotterPanel: () => <div data-testid="blotter" />,
}));
vi.mock('./components/PositionsPanel', () => ({
  PositionsPanel: () => <div data-testid="positions" />,
}));

// ── Mock useWatchlistQuery ───────────────────────────────────────────────────
vi.mock('./hooks/useWatchlistQuery', () => ({
  useWatchlistQuery: () => ({ data: ['AAPL', 'TSLA'], isLoading: false }),
}));

// ── Controllable useMarketStream mock ────────────────────────────────────────
let capturedOnFill: ((fill: FillEvent) => void) | undefined;

vi.mock('./hooks/useMarketStream', () => ({
  useMarketStream: (opts: { onFill?: (fill: FillEvent) => void }): UseMarketStreamResult => {
    capturedOnFill = opts.onFill;
    return { snapshot: {}, status: 'connected' };
  },
}));

const makeFill = (overrides: Partial<FillEvent> = {}): FillEvent => ({
  orderId: 'ord-001',
  symbol: 'AAPL',
  side: 'BUY',
  filledQuantity: 10,
  fillPrice: 160.47,
  accountId: 'acc-001',
  ...overrides,
});

beforeEach(() => {
  capturedOnFill = undefined;
  vi.clearAllMocks();
});

describe('TradingTerminalPage — fill notifications', () => {
  it('Given a fill event, When onFill fires, Should display Snackbar with fill details', async () => {
    renderWithProviders(<TradingTerminalPage />);

    await act(async () => {
      capturedOnFill?.(makeFill());
    });

    await waitFor(() =>
      expect(screen.getByText(/AAPL × 10 BUY FILLED at \$160\.47/i)).toBeInTheDocument(),
    );
  });

  it('Given a fill event, When onFill fires, Should invalidate orders and positions queries', async () => {
    const { queryClient } = renderWithProviders(<TradingTerminalPage />);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      capturedOnFill?.(makeFill());
    });

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['orders'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['positions'] }));
  });

  it('Given SELL fill, When onFill fires, Should show SELL in toast message', async () => {
    renderWithProviders(<TradingTerminalPage />);

    await act(async () => {
      capturedOnFill?.(makeFill({ side: 'SELL', symbol: 'TSLA', filledQuantity: 5, fillPrice: 205.0 }));
    });

    await waitFor(() =>
      expect(screen.getByText(/TSLA × 5 SELL FILLED at \$205/i)).toBeInTheDocument(),
    );
  });
});
