import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WatchlistPanel } from './WatchlistPanel';
import type { WatchlistSnapshot } from './useMarketStream';

vi.mock('./useMarketStream', () => ({
  useMarketStream: vi.fn(),
}));

import { useMarketStream } from './useMarketStream';

const mockUseMarketStream = useMarketStream as ReturnType<typeof vi.fn>;

describe('Given a WatchlistPanel', () => {
  describe('when the stream has not yet delivered any ticks', () => {
    it('should show a connecting message', () => {
      mockUseMarketStream.mockReturnValue({} satisfies WatchlistSnapshot);
      render(<WatchlistPanel />);
      expect(screen.getByText(/connecting/i)).toBeDefined();
    });
  });

  describe('when ticks are available in the snapshot', () => {
    it('should render a row per symbol', () => {
      const snapshot: WatchlistSnapshot = {
        AAPL: { symbol: 'AAPL', bid: 174.99, ask: 175.01, last: 175.0, volume: 1000, timestamp: '' },
        TSLA: { symbol: 'TSLA', bid: 199.99, ask: 200.01, last: 200.0, volume: 500, timestamp: '' },
      };
      mockUseMarketStream.mockReturnValue(snapshot);
      render(<WatchlistPanel />);
      expect(screen.getByText('AAPL')).toBeDefined();
      expect(screen.getByText('TSLA')).toBeDefined();
    });

    it('should display formatted bid, ask, and last prices', () => {
      const snapshot: WatchlistSnapshot = {
        AAPL: { symbol: 'AAPL', bid: 174.99, ask: 175.01, last: 175.0, volume: 1000, timestamp: '' },
      };
      mockUseMarketStream.mockReturnValue(snapshot);
      render(<WatchlistPanel />);
      expect(screen.getByText('174.99')).toBeDefined();
      expect(screen.getByText('175.01')).toBeDefined();
      expect(screen.getByText('175.00')).toBeDefined();
    });
  });
});
