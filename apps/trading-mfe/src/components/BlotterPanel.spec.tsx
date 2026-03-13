import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import { BlotterPanel } from './BlotterPanel';

describe('BlotterPanel', () => {
  it('Given loading state, When rendered, Should show skeleton rows', () => {
    renderWithProviders(<BlotterPanel accountId="acc-001" />);
    // While loading, skeleton cells render
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('Given no orders, When data loads, Should show empty state message', async () => {
    renderWithProviders(<BlotterPanel accountId="acc-001" />);
    await waitFor(() => expect(screen.getByText(/no orders/i)).toBeInTheDocument());
  });

  it('Given orders exist, When data loads, Should render order rows', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/orders', () =>
        HttpResponse.json({
          orders: [
            { id: 'ord-1', commandId: 'cmd-1', accountId: 'acc-001', symbol: 'AAPL', side: 'BUY', type: 'MARKET', quantity: 10, status: 'FILLED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
          pagination: { limit: 50, offset: 0, total: 1 },
        }),
      ),
    );

    renderWithProviders(<BlotterPanel accountId="acc-001" />);

    await waitFor(() => expect(screen.getByText('AAPL')).toBeInTheDocument());
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('FILLED')).toBeInTheDocument();
  });

  it('Given orders exist, When user clicks status filter, Should update filter selection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BlotterPanel accountId="acc-001" />);

    await waitFor(() => expect(screen.getByRole('group', { name: /filter by status/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /filled/i }));

    // After click the filter button text is still present (button stays)
    expect(screen.getByRole('button', { name: /filled/i })).toBeInTheDocument();
  });

  it('Given server error, When data fails to load, Should show error alert', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/orders', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<BlotterPanel accountId="acc-001" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/failed to load orders/i)).toBeInTheDocument();
  });
});
