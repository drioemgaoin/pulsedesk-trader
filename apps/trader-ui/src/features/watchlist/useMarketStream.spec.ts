import { renderHook, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMarketStream } from './useMarketStream';

// Simulate the WS subject; openObserver is called by the hook after connection
const mockSubject = new Subject<unknown>();
const mockComplete = vi.fn();

vi.mock('rxjs/webSocket', () => ({
  webSocket: vi.fn(() => Object.assign(mockSubject, { complete: mockComplete })),
}));

// Emits the raw WS message shape (includes eventType needed by isMarketTick guard)
const makeTick = (symbol: string, last = 100) => ({
  eventType: 'market.tick' as const,
  symbol,
  bid: last - 0.01,
  ask: last + 0.01,
  last,
  volume: 1000,
  timestamp: new Date().toISOString(),
});

const DEFAULT_OPTS = { url: 'ws://localhost:3016/stream', token: 'test-token', symbols: ['AAPL', 'TSLA'] };

describe('useMarketStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no ticks have been received', () => {
    it('returns an empty snapshot and connecting status', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));
      expect(result.current.snapshot).toEqual({});
      expect(result.current.status).toBe('connecting');
    });
  });

  describe('when a valid market.tick is received', () => {
    it('adds the symbol to snapshot and sets status connected', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));
      act(() => {
        mockSubject.next(makeTick('AAPL', 175));
      });
      expect(result.current.snapshot['AAPL']).toBeDefined();
      expect(result.current.snapshot['AAPL']?.last).toBe(175);
      expect(result.current.status).toBe('connected');
    });
  });

  describe('when a second tick arrives for the same symbol', () => {
    it('replaces the previous entry without duplicating symbols', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));
      act(() => { mockSubject.next(makeTick('AAPL', 175)); });
      act(() => { mockSubject.next(makeTick('AAPL', 176)); });
      expect(result.current.snapshot['AAPL']?.last).toBe(176);
      expect(Object.keys(result.current.snapshot)).toHaveLength(1);
    });
  });

  describe('when ticks for multiple symbols arrive', () => {
    it('maintains one entry per symbol', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));
      act(() => {
        mockSubject.next(makeTick('AAPL', 175));
        mockSubject.next(makeTick('TSLA', 200));
        mockSubject.next(makeTick('NVDA', 850));
      });
      expect(Object.keys(result.current.snapshot)).toHaveLength(3);
      expect(result.current.snapshot['TSLA']?.last).toBe(200);
    });
  });

  describe('when a non-tick message is received', () => {
    it('ignores the message and keeps snapshot unchanged', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));
      act(() => { mockSubject.next({ event: 'subscribed', data: { symbols: ['AAPL'] } }); });
      expect(result.current.snapshot).toEqual({});
    });
  });
});
