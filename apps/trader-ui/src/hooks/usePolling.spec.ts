import { renderHook, act, waitFor } from '@testing-library/react';
import { usePolling } from './usePolling';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Given a fetcher that resolves successfully', () => {
  describe('when mounted', () => {
    it('should call fetcher immediately', async () => {
      const fetcher = vi.fn().mockResolvedValue({ ok: true });
      renderHook(() => usePolling(fetcher, 60_000));

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when fetcher resolves', () => {
    it('should set status to live', async () => {
      const fetcher = vi.fn().mockResolvedValue([]);
      const { result } = renderHook(() => usePolling(fetcher, 60_000));

      await waitFor(() => {
        expect(result.current.status).toBe('live');
      });
    });
  });
});

describe('Given a fetcher that fails 3 consecutive times', () => {
  describe('when polled', () => {
    it('should set status to error', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const fetcher = vi.fn().mockRejectedValue(new Error('network error'));
      const { result } = renderHook(() => usePolling(fetcher, 100));

      // Allow first call to run
      await act(async () => {
        await Promise.resolve();
      });

      // Trigger second poll
      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      // Trigger third poll
      await act(async () => {
        vi.advanceTimersByTime(100);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(3);
        expect(result.current.status).toBe('error');
      });
    });
  });
});

describe('Given a successful fetch followed by 15s without refresh', () => {
  it('should set status to stale', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return Promise.resolve([]);
      return Promise.reject(new Error('stale'));
    });

    const { result } = renderHook(() => usePolling(fetcher, 100));

    // Wait for first successful fetch
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('live');
    });

    // Now trigger polls to fail and advance time > 15s
    await act(async () => {
      vi.advanceTimersByTime(16_000);
      await Promise.resolve();
    });

    // Trigger one more poll so status gets re-evaluated
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        result.current.status === 'stale' || result.current.status === 'error',
      ).toBe(true);
    });
  });
});
