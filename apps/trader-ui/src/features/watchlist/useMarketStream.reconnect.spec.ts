/**
 * M5-T4 — End-to-end consistency tests: useMarketStream reconnect/resubscribe
 *
 * Scope: reconnect status transitions, re-subscribe on reconnect,
 *        snapshot retention across disconnect, exponential backoff.
 */

import { renderHook, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMarketStream } from './useMarketStream';

// ─── Mock factory ─────────────────────────────────────────────────────────────

interface MockSubject extends Subject<unknown> {
  complete: ReturnType<typeof vi.fn>;
}

/** Captures per-call context so tests can drive individual connections. */
const calls: Array<{ subject: MockSubject; openObserver: { next: () => void } | undefined }> = [];

vi.mock('rxjs/webSocket', () => ({
  webSocket: vi.fn((config: { openObserver?: { next: () => void } }) => {
    const base = new Subject<unknown>();
    // Capture the prototype complete BEFORE Object.assign overwrites the property,
    // so mockComplete doesn't recurse into itself.
    const originalComplete = Subject.prototype.complete.bind(base);
    const mockComplete = vi.fn(() => originalComplete());
    const subject = Object.assign(base, { complete: mockComplete }) as MockSubject;
    calls.push({ subject, openObserver: config.openObserver });
    return subject;
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentCall() {
  return calls[calls.length - 1]!;
}

function simulateOpen() {
  currentCall().openObserver?.next();
}

const makeTick = (symbol: string, last = 100) => ({
  eventType: 'market.tick' as const,
  symbol,
  bid: last - 0.01,
  ask: last + 0.01,
  last,
  volume: 1000,
  timestamp: new Date().toISOString(),
});

const DEFAULT_OPTS = { url: 'ws://localhost:3016/stream', token: 'tok', symbols: ['AAPL'] };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useMarketStream — reconnect behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    calls.length = 0;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── AC2: Status transitions on error ────────────────────────────────────────

  describe('when the WS connection errors', () => {
    it('transitions status to reconnecting', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));
      expect(result.current.status).toBe('connecting');

      act(() => {
        currentCall().subject.error(new Error('ws close'));
      });

      expect(result.current.status).toBe('reconnecting');
    });

    it('transitions back to connecting after the retry delay', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));
      const callsBefore = calls.length;

      act(() => { currentCall().subject.error(new Error('ws error')); });
      expect(result.current.status).toBe('reconnecting');

      act(() => { vi.advanceTimersByTime(1000); });

      expect(calls.length).toBe(callsBefore + 1); // new webSocket() call
      expect(result.current.status).toBe('connecting');
    });

    it('sends a subscribe message on the new connection (resubscribe)', () => {
      renderHook(() => useMarketStream(DEFAULT_OPTS));

      // Trigger error → reconnect
      act(() => { currentCall().subject.error(new Error('dropped')); });
      act(() => { vi.advanceTimersByTime(1000); });

      // Simulate the new connection opening
      const newCallSubject = currentCall().subject;
      const sendSpy = vi.spyOn(newCallSubject, 'next');
      act(() => { simulateOpen(); });

      expect(sendSpy).toHaveBeenCalledWith({
        event: 'subscribe',
        data: { symbols: DEFAULT_OPTS.symbols },
      });
    });
  });

  // ── AC2: Snapshot retained across disconnect ─────────────────────────────────

  describe('when a tick is received before disconnect', () => {
    it('retains the snapshot after the connection errors', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));

      act(() => { currentCall().subject.next(makeTick('AAPL', 175)); });
      expect(result.current.snapshot['AAPL']?.last).toBe(175);

      act(() => { currentCall().subject.error(new Error('drop')); });

      // Snapshot must not be cleared during the reconnecting window
      expect(result.current.snapshot['AAPL']?.last).toBe(175);
      expect(result.current.status).toBe('reconnecting');
    });

    it('continues to accumulate ticks after reconnect without replaying missed ones', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));

      act(() => { currentCall().subject.next(makeTick('AAPL', 175)); });

      // Disconnect (tick at 176 is "missed" during gap)
      act(() => { currentCall().subject.error(new Error('drop')); });
      act(() => { vi.advanceTimersByTime(1000); }); // reconnect

      // Tick after reconnect
      act(() => { currentCall().subject.next(makeTick('AAPL', 177)); });

      expect(result.current.snapshot['AAPL']?.last).toBe(177); // latest post-reconnect value
      expect(result.current.status).toBe('connected');
    });
  });

  // ── AC2: Exponential backoff ─────────────────────────────────────────────────

  describe('exponential backoff on consecutive failures', () => {
    it('doubles the retry delay after each successive failure', () => {
      renderHook(() => useMarketStream(DEFAULT_OPTS));
      const initialCallCount = calls.length;

      // First failure — retries after 1000 ms
      act(() => { currentCall().subject.error(new Error('e1')); });
      act(() => { vi.advanceTimersByTime(999); });
      expect(calls.length).toBe(initialCallCount); // not yet

      act(() => { vi.advanceTimersByTime(1); }); // +1 ms → total 1000
      expect(calls.length).toBe(initialCallCount + 1);

      // Second failure — retries after 2000 ms
      act(() => { currentCall().subject.error(new Error('e2')); });
      act(() => { vi.advanceTimersByTime(1999); });
      expect(calls.length).toBe(initialCallCount + 1); // not yet

      act(() => { vi.advanceTimersByTime(1); }); // +1 ms → total 2000
      expect(calls.length).toBe(initialCallCount + 2);
    });

    it('caps backoff at 30 seconds', () => {
      renderHook(() => useMarketStream(DEFAULT_OPTS));

      // Simulate many consecutive failures to saturate the cap
      for (let i = 0; i < 10; i++) {
        act(() => { currentCall().subject.error(new Error(`e${i}`)); });
        act(() => { vi.advanceTimersByTime(30_001); }); // always advance past max
      }

      const callCount = calls.length;
      // One more failure — should retry within 30s
      act(() => { currentCall().subject.error(new Error('e-cap')); });
      act(() => { vi.advanceTimersByTime(30_001); });
      expect(calls.length).toBe(callCount + 1);
    });
  });

  // ── AC2: Clean disconnect (complete) also reconnects ────────────────────────

  describe('when the WS stream completes cleanly', () => {
    it('sets status to reconnecting and schedules a reconnect', () => {
      const { result } = renderHook(() => useMarketStream(DEFAULT_OPTS));
      const callsBefore = calls.length;

      act(() => { currentCall().subject.complete(); });
      expect(result.current.status).toBe('reconnecting');

      act(() => { vi.advanceTimersByTime(1000); });
      expect(calls.length).toBe(callsBefore + 1);
    });
  });
});
