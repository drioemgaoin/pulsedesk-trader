import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, makeStore } from '../test-utils/renderWithProviders';
import { WatchlistPanel } from './WatchlistPanel';
import type { WatchlistSnapshot } from '../hooks/useMarketStream';

const snapshot: WatchlistSnapshot = {
  AAPL: { symbol: 'AAPL', bid: 149.5, ask: 150.0, last: 149.75, volume: 5_000_000, timestamp: new Date().toISOString() },
  TSLA: { symbol: 'TSLA', bid: 199.0, ask: 200.0, last: 199.5, volume: 3_000_000, timestamp: new Date().toISOString() },
};

describe('WatchlistPanel', () => {
  it('Given snapshot data, When rendered, Should display symbol rows', () => {
    renderWithProviders(<WatchlistPanel snapshot={snapshot} status="connected" />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
  });

  it('Given empty snapshot, When rendered, Should show waiting message', () => {
    renderWithProviders(<WatchlistPanel snapshot={{}} status="connecting" />);
    expect(screen.getByText(/waiting for market data/i)).toBeInTheDocument();
  });

  it('Given symbol clicked, When user clicks row, Should dispatch setSelectedSymbol to store', () => {
    const { store } = renderWithProviders(<WatchlistPanel snapshot={snapshot} status="connected" />);
    fireEvent.click(screen.getByText('TSLA'));
    const state = store.getState() as { terminal: { selectedSymbol: string } };
    expect(state.terminal.selectedSymbol).toBe('TSLA');
  });

  it('Given search input, When user types filter, Should filter rows', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WatchlistPanel snapshot={snapshot} status="connected" />);
    await user.type(screen.getByLabelText(/filter symbols/i), 'AA');
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument();
  });

  it('Given selected symbol in store, When rendered, Should mark row as selected', () => {
    const store = makeStore({ terminal: { selectedSymbol: 'AAPL', connectionStatus: 'connecting' } } as Parameters<typeof makeStore>[0]);
    renderWithProviders(<WatchlistPanel snapshot={snapshot} status="connected" />, { store });
    const aaplRow = screen.getByRole('row', { name: /AAPL/i });
    expect(aaplRow).toHaveAttribute('aria-selected', 'true');
  });
});
