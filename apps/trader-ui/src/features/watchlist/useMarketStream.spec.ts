import { renderHook, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMarketStream, type MarketTick } from './useMarketStream';

const mockSubject = new Subject<MarketTick>();

vi.mock('rxjs/webSocket', () => ({
  webSocket: vi.fn(() => Object.assign(mockSubject, { complete: vi.fn() })),
}));

const makeTick = (symbol: string, last = 100): MarketTick => ({
  symbol,
  bid: last - 0.01,
  ask: last + 0.01,
  last,
  volume: 1000,
  timestamp: new Date().toISOString(),
});

describe('Given useMarketStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no ticks have been received', () => {
    it('should return an empty snapshot', () => {
      const { result } = renderHook(() => useMarketStream('ws://localhost:3016/stream'));
      expect(result.current).toEqual({});
    });
  });

  describe('when a tick is received for a new symbol', () => {
    it('should add the symbol to the snapshot', () => {
      const { result } = renderHook(() => useMarketStream('ws://localhost:3016/stream'));
      act(() => {
        mockSubject.next(makeTick('AAPL', 175));
      });
      expect(result.current['AAPL']).toBeDefined();
      expect(result.current['AAPL']?.last).toBe(175);
    });
  });

  describe('when a second tick arrives for the same symbol', () => {
    it('should replace the previous entry without accumulating stale state', () => {
      const { result } = renderHook(() => useMarketStream('ws://localhost:3016/stream'));
      act(() => {
        mockSubject.next(makeTick('AAPL', 175));
      });
      act(() => {
        mockSubject.next(makeTick('AAPL', 176));
      });
      expect(result.current['AAPL']?.last).toBe(176);
      expect(Object.keys(result.current)).toHaveLength(1);
    });
  });

  describe('when ticks for multiple symbols are received', () => {
    it('should maintain one entry per symbol', () => {
      const { result } = renderHook(() => useMarketStream('ws://localhost:3016/stream'));
      act(() => {
        mockSubject.next(makeTick('AAPL', 175));
        mockSubject.next(makeTick('TSLA', 200));
        mockSubject.next(makeTick('NVDA', 850));
      });
      expect(Object.keys(result.current)).toHaveLength(3);
      expect(result.current['TSLA']?.last).toBe(200);
    });
  });
});
