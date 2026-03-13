import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { renderWithProviders } from './test-utils/renderWithProviders';
import PortfolioPage from './PortfolioPage';
import type { PositionV1 } from './api/types';

// ── Mock canvas-based chart components ──────────────────────────────────────
vi.mock('./components/Sparkline', () => ({
  Sparkline: () => <canvas data-testid="sparkline" />,
}));
vi.mock('./components/PnlChart', () => ({
  PnlChart: () => <div data-testid="pnl-chart" />,
}));

// ── Mock useMarketStream (no WS in tests) ───────────────────────────────────
vi.mock('./hooks/useMarketStream', () => ({
  useMarketStream: () => ({ snapshot: {}, status: 'connecting' }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
const makePosition = (overrides: Partial<PositionV1> = {}): PositionV1 => ({
  accountId: 'acc-001',
  symbol: 'AAPL',
  quantity: 100,
  averageCost: 150,
  marketPrice: 160,
  unrealizedPnl: 1000,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

function withPositions(positions: PositionV1[], totalUnrealizedPnl = 0) {
  server.use(
    http.get('http://localhost:3000/api/v1/positions', () =>
      HttpResponse.json({
        accountId: 'acc-001',
        positions,
        totalUnrealizedPnl,
        asOf: new Date().toISOString(),
      }),
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Empty state ──────────────────────────────────────────────────────────────
describe('Given no positions', () => {
  it('When data loads, Should show empty state heading and CTA', async () => {
    renderWithProviders(<PortfolioPage />);
    await waitFor(() =>
      expect(screen.getByText('No open positions')).toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: /go to trading terminal/i })).toBeInTheDocument();
  });
});

// ── Account summary ──────────────────────────────────────────────────────────
describe('Given multiple positions', () => {
  const positions = [
    makePosition({ symbol: 'AAPL', quantity: 100, marketPrice: 160, unrealizedPnl: 1000 }),
    makePosition({ symbol: 'TSLA', quantity: 50, marketPrice: 200, unrealizedPnl: -500 }),
  ];

  beforeEach(() => {
    withPositions(positions, 500);
  });

  it('When data loads, Should display correct open position count', async () => {
    renderWithProviders(<PortfolioPage />);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  });

  it('When data loads, Should display correct total market value', async () => {
    renderWithProviders(<PortfolioPage />);
    // 100×160 + 50×200 = 26,000
    await waitFor(() =>
      expect(screen.getByText('$26,000.00')).toBeInTheDocument(),
    );
  });

  it('When data loads, Should display symbol rows in the table', async () => {
    renderWithProviders(<PortfolioPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
    expect(screen.getByText('TSLA')).toBeInTheDocument();
  });
});

// ── Sorting ──────────────────────────────────────────────────────────────────
describe('Given positions with different symbols', () => {
  beforeEach(() => {
    withPositions([
      makePosition({ symbol: 'TSLA', quantity: 50, marketPrice: 200, unrealizedPnl: 500 }),
      makePosition({ symbol: 'AAPL', quantity: 100, marketPrice: 160, unrealizedPnl: 1000 }),
    ]);
  });

  it('When Symbol column header clicked, Should sort ascending by default', async () => {
    renderWithProviders(<PortfolioPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());

    // Default sort is symbol asc — AAPL should come before TSLA in DOM
    const rows = screen.getAllByRole('row');
    const bodyRows = rows.slice(1); // skip header
    expect(bodyRows[0]).toHaveTextContent('AAPL');
    expect(bodyRows[1]).toHaveTextContent('TSLA');
  });

  it('When Symbol column clicked twice, Should reverse to descending order', async () => {
    renderWithProviders(<PortfolioPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());

    // Click once → desc
    fireEvent.click(screen.getByRole('button', { name: /symbol/i }));

    const rows = screen.getAllByRole('row');
    const bodyRows = rows.slice(1);
    expect(bodyRows[0]).toHaveTextContent('TSLA');
    expect(bodyRows[1]).toHaveTextContent('AAPL');
  });
});

// ── Symbol filter ────────────────────────────────────────────────────────────
describe('Given positions with multiple symbols', () => {
  beforeEach(() => {
    withPositions([
      makePosition({ symbol: 'AAPL' }),
      makePosition({ symbol: 'TSLA' }),
    ]);
  });

  it('When user filters by symbol, Should show only matching rows', async () => {
    renderWithProviders(<PortfolioPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('filter symbols'), {
      target: { value: 'AA' },
    });

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument();
  });
});

// ── CSV export ───────────────────────────────────────────────────────────────
describe('Given positions data loaded', () => {
  beforeEach(() => {
    withPositions([makePosition({ symbol: 'AAPL' })]);
  });

  it('When CSV export button clicked, Should call URL.createObjectURL', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);

    renderWithProviders(<PortfolioPage />);
    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('export positions as CSV'));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });
});

// ── Error state ──────────────────────────────────────────────────────────────
describe('Given the API returns an error', () => {
  it('When data fails to load, Should show error alert', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/positions', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<PortfolioPage />);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    );
    expect(screen.getByText(/failed to load positions/i)).toBeInTheDocument();
  });
});
