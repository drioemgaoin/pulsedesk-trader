import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { renderWithProviders, makeStore } from '../test-utils/renderWithProviders';
import { OrderTicketPanel } from './OrderTicketPanel';

describe('OrderTicketPanel', () => {
  it('Given no symbol selected, When rendered, Should show empty symbol field', () => {
    const store = makeStore({ terminal: { selectedSymbol: '', connectionStatus: 'connecting' } } as Parameters<typeof makeStore>[0]);
    renderWithProviders(<OrderTicketPanel />, { store });
    expect(screen.getByLabelText('Symbol')).toHaveValue('');
  });

  it('Given symbol in Redux store, When rendered, Should pre-fill symbol field', () => {
    const store = makeStore({ terminal: { selectedSymbol: 'TSLA', connectionStatus: 'connecting' } } as Parameters<typeof makeStore>[0]);
    renderWithProviders(<OrderTicketPanel />, { store });
    expect(screen.getByLabelText('Symbol')).toHaveValue('TSLA');
  });

  it('Given form submitted, When order succeeds, Should show success snackbar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrderTicketPanel />);

    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '10');
    await user.click(screen.getByRole('button', { name: /submit order/i }));

    await waitFor(() => expect(screen.getByText(/order submitted successfully/i)).toBeInTheDocument());
  });

  it('Given form submitted, When server returns error, Should show error alert', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/orders', () =>
        HttpResponse.json({ message: 'Insufficient funds' }, { status: 422 }),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<OrderTicketPanel />);

    await user.type(screen.getByLabelText('Symbol'), 'AAPL');
    await user.type(screen.getByLabelText('Quantity'), '10');
    await user.click(screen.getByRole('button', { name: /submit order/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument();
  });

  it('Given LIMIT type selected, When rendered, Should show limit price field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrderTicketPanel />);

    await user.click(screen.getByRole('button', { name: /limit order/i }));

    expect(screen.getByLabelText('Limit price')).toBeInTheDocument();
  });

  it('Given MARKET type, When rendered, Should not show limit price field', () => {
    renderWithProviders(<OrderTicketPanel />);
    expect(screen.queryByLabelText('Limit price')).not.toBeInTheDocument();
  });
});
