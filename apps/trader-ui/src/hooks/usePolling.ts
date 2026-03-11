import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type PollingStatus = 'loading' | 'live' | 'stale' | 'error';

export interface PollingResult<T> {
  data: T | null;
  status: PollingStatus;
  lastUpdated: number | null;
}

const STALE_THRESHOLD_MS = 15_000;
const HIDDEN_INTERVAL_MS = 15_000;
const CONSECUTIVE_FAILURE_THRESHOLD = 3;

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<PollingStatus>('loading');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const consecutiveFailuresRef = useRef(0);
  const lastUpdatedRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  const intervalMsRef = useRef(intervalMs);

  // Keep refs current without causing re-renders (layout effect runs sync before paint)
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
    intervalMsRef.current = intervalMs;
  });

  useEffect(() => {
    mountedRef.current = true;

    function scheduleNext(): void {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      const hidden = document.visibilityState === 'hidden';
      timerRef.current = setTimeout(() => {
        void doPoll();
      }, hidden ? HIDDEN_INTERVAL_MS : intervalMsRef.current);
    }

    async function doPoll(): Promise<void> {
      if (!mountedRef.current) return;

      try {
        const result = await fetcherRef.current();
        if (!mountedRef.current) return;

        consecutiveFailuresRef.current = 0;
        const now = Date.now();
        lastUpdatedRef.current = now;
        setData(result);
        setLastUpdated(now);
        setStatus('live');
      } catch {
        if (!mountedRef.current) return;

        consecutiveFailuresRef.current += 1;

        if (consecutiveFailuresRef.current >= CONSECUTIVE_FAILURE_THRESHOLD) {
          setStatus('error');
        } else if (
          lastUpdatedRef.current !== null &&
          Date.now() - lastUpdatedRef.current > STALE_THRESHOLD_MS
        ) {
          setStatus('stale');
        }
      }

      if (!mountedRef.current) return;

      // Check stale even after success (in case data is getting old)
      if (
        lastUpdatedRef.current !== null &&
        consecutiveFailuresRef.current < CONSECUTIVE_FAILURE_THRESHOLD &&
        Date.now() - lastUpdatedRef.current > STALE_THRESHOLD_MS
      ) {
        setStatus('stale');
      }

      scheduleNext();
    }

    // Fire immediately on mount
    void doPoll();

    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { data, status, lastUpdated };
}
