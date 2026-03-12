import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Subject } from 'rxjs';

// ── RxJS webSocket mock ──────────────────────────────────────────────────────
let _subject: { next: (v: unknown) => void; error: (e: unknown) => void; complete: () => void };
const subscribeSpy = vi.fn();

vi.mock('rxjs/webSocket', () => ({
  webSocket: vi.fn(() => {
    const listeners: { next?: (v: unknown) => void; error?: (e: unknown) => void; complete?: () => void } = {};
    _subject = {
      next: (v) => listeners.next?.(v),
      error: (e) => listeners.error?.(e),
      complete: () => listeners.complete?.(),
    };
    return {
      next: vi.fn(),
      complete: vi.fn(),
      subscribe: (obs: typeof listeners) => {
        Object.assign(listeners, obs);
        subscribeSpy(obs);
        return { unsubscribe: vi.fn() };
      },
    };
  }),
}));

import { useMarketStream } from './useMarketStream';

const BASE_OPTIONS = { url: 'ws://localhost:3016/stream', token: 'tok', symbols: ['AAPL'] };

beforeEach(() => {
  subscribeSpy.mockClear();
  vi.clearAllMocks();
});

describe('useMarketStream — fill events', () => {
  it('Given onFill and matching accountId, When order.filled received, Should call onFill', async () => {
    const onFill = vi.fn();

    renderHook(() =>
      useMarketStream({ ...BASE_OPTIONS, accountId: 'acc-001', onFill }),
    );

    await act(async () => {
      _subject.next({ event: 'order.filled', data: { orderId: 'o1', symbol: 'AAPL', side: 'BUY', filledQuantity: 5, fillPrice: 150, accountId: 'acc-001' } });
    });

    expect(onFill).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'o1', fillPrice: 150, accountId: 'acc-001' }),
    );
  });

  it('Given onFill and non-matching accountId, When order.filled received, Should NOT call onFill', async () => {
    const onFill = vi.fn();

    renderHook(() =>
      useMarketStream({ ...BASE_OPTIONS, accountId: 'acc-001', onFill }),
    );

    await act(async () => {
      _subject.next({ event: 'order.filled', data: { orderId: 'o2', symbol: 'AAPL', side: 'SELL', filledQuantity: 3, fillPrice: 155, accountId: 'acc-999' } });
    });

    expect(onFill).not.toHaveBeenCalled();
  });

  it('Given onFill with no accountId, When order.filled received, Should call onFill for any account', async () => {
    const onFill = vi.fn();

    renderHook(() =>
      useMarketStream({ ...BASE_OPTIONS, onFill }),
    );

    await act(async () => {
      _subject.next({ event: 'order.filled', data: { orderId: 'o3', symbol: 'TSLA', side: 'BUY', filledQuantity: 10, fillPrice: 200, accountId: 'acc-any' } });
    });

    expect(onFill).toHaveBeenCalledTimes(1);
  });

  it('Given market.tick message, When received, Should NOT call onFill', async () => {
    const onFill = vi.fn();

    renderHook(() =>
      useMarketStream({ ...BASE_OPTIONS, onFill }),
    );

    await act(async () => {
      _subject.next({ eventType: 'market.tick', symbol: 'AAPL', bid: 149, ask: 150, last: 149.5, volume: 1000, timestamp: new Date().toISOString() });
    });

    expect(onFill).not.toHaveBeenCalled();
  });

  it('Given market.tick, When received, Should update snapshot', async () => {
    const { result } = renderHook(() =>
      useMarketStream({ ...BASE_OPTIONS }),
    );

    await act(async () => {
      _subject.next({ eventType: 'market.tick', symbol: 'AAPL', bid: 149, ask: 150, last: 149.5, volume: 1000, timestamp: '2024-01-01T00:00:00Z' });
    });

    expect(result.current.snapshot['AAPL']).toMatchObject({ bid: 149, ask: 150 });
  });
});
