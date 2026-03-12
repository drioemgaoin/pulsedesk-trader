import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import { PositionsPanel } from './PositionsPanel';

describe('PositionsPanel', () => {
  it('Given no positions, When data loads, Should show empty state message', async () => {
    renderWithProviders(<PositionsPanel accountId="acc-001" />);
    await waitFor(() => expect(screen.getByText(/no positions/i)).toBeInTheDocument());
  });

  it('Given positions exist, When data loads, Should render position rows with PnL', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/positions', () =>
        HttpResponse.json({
          accountId: 'acc-001',
          positions: [
            { accountId: 'acc-001', symbol: 'AAPL', quantity: 100, averageCost: 150.0, marketPrice: 160.0, unrealizedPnl: 1000.0, updatedAt: new Date().toISOString() },
          ],
          totalUnrealizedPnl: 1000.0,
          asOf: new Date().toISOString(),
        }),
      ),
    );

    renderWithProviders(<PositionsPanel accountId="acc-001" />);

    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('+1,000.00')).toBeInTheDocument();
  });

  it('Given server error, When data fails to load, Should show error alert', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/positions', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<PositionsPanel accountId="acc-001" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/failed to load positions/i)).toBeInTheDocument();
  });
});
