import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChartPanel } from './ChartPanel';
import type { MarketTick } from '../watchlist/useMarketStream';

// lightweight-charts creates a canvas-based chart; mock the entire module
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ update: vi.fn() })),
    applyOptions: vi.fn(),
    remove: vi.fn(),
  })),
  ColorType: { Solid: 'solid' },
  LineSeries: {},
}));

// Mock ResizeObserver (not available in jsdom)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

const makeTick = (symbol: string, last = 100): MarketTick => ({
  symbol,
  bid: last - 0.01,
  ask: last + 0.01,
  last,
  volume: 1000,
  timestamp: new Date().toISOString(),
});

describe('ChartPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no symbol is selected', () => {
    it('shows a placeholder prompt', () => {
      render(<ChartPanel symbol={null} tick={null} streamStatus="connected" />);
      expect(screen.getByText(/select a symbol/i)).toBeDefined();
    });
  });

  describe('when a symbol is selected but no tick has arrived', () => {
    it('shows waiting for first tick message', () => {
      render(<ChartPanel symbol="AAPL" tick={null} streamStatus="connected" />);
      expect(screen.getByText(/waiting for first tick/i)).toBeDefined();
    });
  });

  describe('when a tick arrives', () => {
    it('displays the last price in the header', async () => {
      const tick = makeTick('AAPL', 175.5);
      render(<ChartPanel symbol="AAPL" tick={tick} streamStatus="connected" />);
      await waitFor(() => expect(screen.getByText('175.50')).toBeDefined());
    });

    it('renders the symbol name in the header', () => {
      const tick = makeTick('AAPL', 175.5);
      render(<ChartPanel symbol="AAPL" tick={tick} streamStatus="connected" />);
      expect(screen.getByText('AAPL')).toBeDefined();
    });
  });

  describe('when the stream is reconnecting', () => {
    it('shows a stream paused indicator', () => {
      const tick = makeTick('AAPL', 100);
      render(<ChartPanel symbol="AAPL" tick={tick} streamStatus="reconnecting" />);
      expect(screen.getByText(/stream paused/i)).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('has a live region for screen readers', () => {
      render(<ChartPanel symbol="AAPL" tick={null} streamStatus="connected" />);
      const region = screen.getByRole('status');
      expect(region).toBeDefined();
    });

    it('includes symbol and price in the live region when tick arrives', async () => {
      const tick = makeTick('TSLA', 200);
      render(<ChartPanel symbol="TSLA" tick={tick} streamStatus="connected" />);
      await waitFor(() => {
        const region = screen.getByRole('status');
        expect(region.textContent).toMatch(/TSLA/);
        expect(region.textContent).toMatch(/200\.00/);
      });
    });
  });
});
