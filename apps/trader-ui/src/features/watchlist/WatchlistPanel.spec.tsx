import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WatchlistPanel } from './WatchlistPanel';
import type { WatchlistSnapshot, WsStatus } from './useMarketStream';

const CONNECTED: WsStatus = 'connected';
const CONNECTING: WsStatus = 'connecting';

function makeSnapshot(overrides: Partial<WatchlistSnapshot> = {}): WatchlistSnapshot {
  return {
    AAPL: { symbol: 'AAPL', bid: 174.99, ask: 175.01, last: 175.0, volume: 1000, timestamp: '' },
    TSLA: { symbol: 'TSLA', bid: 199.99, ask: 200.01, last: 200.0, volume: 500, timestamp: '' },
    ...overrides,
  };
}

function renderPanel(
  opts: {
    snapshot?: WatchlistSnapshot;
    status?: WsStatus;
    selectedSymbol?: string | null;
    onSymbolSelect?: (s: string) => void;
  } = {},
) {
  const {
    snapshot = makeSnapshot(),
    status = CONNECTED,
    selectedSymbol = null,
    onSymbolSelect = vi.fn(),
  } = opts;
  return render(
    <WatchlistPanel
      snapshot={snapshot}
      status={status}
      selectedSymbol={selectedSymbol}
      onSymbolSelect={onSymbolSelect}
    />,
  );
}

describe('WatchlistPanel', () => {
  describe('given an empty snapshot and status=connecting', () => {
    it('shows connecting message', () => {
      renderPanel({ snapshot: {}, status: CONNECTING });
      expect(screen.getByText(/connecting/i)).toBeDefined();
    });
  });

  describe('given ticks are available', () => {
    it('renders a row per symbol', () => {
      renderPanel();
      expect(screen.getByText('AAPL')).toBeDefined();
      expect(screen.getByText('TSLA')).toBeDefined();
    });

    it('formats bid, ask, and last to 2 decimal places', () => {
      renderPanel({ snapshot: { AAPL: { symbol: 'AAPL', bid: 174.99, ask: 175.01, last: 175.0, volume: 1000, timestamp: '' } } });
      expect(screen.getByText('174.99')).toBeDefined();
      expect(screen.getByText('175.01')).toBeDefined();
      expect(screen.getByText('175.00')).toBeDefined();
    });

    it('formats volume with locale separators', () => {
      renderPanel({ snapshot: { AAPL: { symbol: 'AAPL', bid: 1, ask: 1, last: 1, volume: 1_234_567, timestamp: '' } } });
      const cell = screen.getByText(/1[,.]?234[,.]?567/);
      expect(cell).toBeDefined();
    });
  });

  describe('given a selected symbol', () => {
    it('marks the selected row with aria-selected=true', () => {
      renderPanel({ selectedSymbol: 'TSLA' });
      const rows = screen.getAllByRole('row');
      const tslaRow = rows.find((r) => r.textContent?.includes('TSLA'));
      expect(tslaRow?.getAttribute('aria-selected')).toBe('true');
    });

    it('marks non-selected rows with aria-selected=false', () => {
      renderPanel({ selectedSymbol: 'TSLA' });
      const rows = screen.getAllByRole('row');
      const aaplRow = rows.find((r) => r.textContent?.includes('AAPL'));
      expect(aaplRow?.getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('given a row is clicked', () => {
    it('calls onSymbolSelect with the symbol', () => {
      const onSymbolSelect = vi.fn();
      renderPanel({ onSymbolSelect });
      fireEvent.click(screen.getByText('AAPL').closest('tr')!);
      expect(onSymbolSelect).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('given a search term is typed', () => {
    it('filters rows to matching symbols', () => {
      renderPanel();
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'TS' } });
      expect(screen.getByText('TSLA')).toBeDefined();
      expect(screen.queryByText('AAPL')).toBeNull();
    });

    it('shows no-match message when filter matches nothing', () => {
      renderPanel();
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'XYZ' } });
      expect(screen.getByText(/no symbols match filter/i)).toBeDefined();
    });
  });
});
