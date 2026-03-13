import { useCallback, useEffect, useRef, useState } from 'react';
import { Semaphore } from '../lib/semaphore';
import { buildDelays, totalOrderCount } from '../lib/generators';
import { buildOrderPayload, makeDuplicateKey } from '../lib/scenarios';
import { emptyStats, applyUpdate } from '../lib/stats';
import type { ProfileConfig } from '../lib/generators';
import type { ScenarioType } from '../lib/scenarios';
import type { SimulatorStats, StatUpdate } from '../lib/stats';

const API_BASE =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'http://localhost:3000';

const RATE_LIMIT_PER_MIN =
  parseInt((import.meta.env['VITE_RATE_LIMIT_PER_MIN'] as string | undefined) ?? '100', 10);

export interface FeedRow {
  id: string;
  ts: number; // Date.now()
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number | undefined;
  status: 'ACCEPTED' | 'FILLED' | 'REJECTED' | 'ERROR';
  latencyMs: number;
  errorMessage?: string;
}

export interface RunConfig {
  profile: ProfileConfig;
  symbols: string[];
  maxConcurrency: number;
  scenario: ScenarioType;
  accountId: string;
  token: string;
}

export type SimulatorStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface SimulatorState {
  status: SimulatorStatus;
  stats: SimulatorStats;
  feed: FeedRow[];
  fired: number;
  total: number | null;
  elapsedMs: number;
  rateLimitWarning: boolean;
}

const MAX_FEED = 500;

export function useSimulator() {
  const [state, setState] = useState<SimulatorState>({
    status: 'idle',
    stats: emptyStats(),
    feed: [],
    fired: 0,
    total: null,
    elapsedMs: 0,
    rateLimitWarning: false,
  });

  // Mutable refs shared with the run loop
  const aliveRef = useRef(false);
  const pausedRef = useRef(false);
  const statsRef = useRef<SimulatorStats>(emptyStats());
  const feedRef = useRef<FeedRow[]>([]);
  const firedRef = useRef(0);
  const startTimeRef = useRef(0);
  const elapsedTimerId = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopElapsedTimer() {
    if (elapsedTimerId.current !== null) {
      clearInterval(elapsedTimerId.current);
      elapsedTimerId.current = null;
    }
  }

  function flush() {
    setState((prev) => ({
      ...prev,
      stats: { ...statsRef.current, errorBreakdown: new Map(statsRef.current.errorBreakdown) },
      feed: [...feedRef.current],
      fired: firedRef.current,
      elapsedMs: Date.now() - startTimeRef.current,
    }));
  }

  const start = useCallback(async (config: RunConfig) => {
    // Check rate limit warning
    let ratePerMin = 0;
    if (config.profile.profile === 'Steady') ratePerMin = config.profile.ratePerSecond * 60;
    if (config.profile.profile === 'Ramp') ratePerMin = config.profile.maxRatePerSecond * 60;

    const delays = buildDelays(config.profile);
    const total = totalOrderCount(config.profile);
    const duplicateKey = config.scenario === 'DuplicateKeys' ? makeDuplicateKey() : undefined;

    aliveRef.current = true;
    pausedRef.current = false;
    statsRef.current = emptyStats();
    feedRef.current = [];
    firedRef.current = 0;
    startTimeRef.current = Date.now();

    setState({
      status: 'running',
      stats: emptyStats(),
      feed: [],
      fired: 0,
      total,
      elapsedMs: 0,
      rateLimitWarning: ratePerMin > RATE_LIMIT_PER_MIN,
    });

    // Elapsed timer — updates every second
    stopElapsedTimer();
    elapsedTimerId.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        elapsedMs: Date.now() - startTimeRef.current,
        fired: firedRef.current,
        stats: { ...statsRef.current, errorBreakdown: new Map(statsRef.current.errorBreakdown) },
        feed: [...feedRef.current],
      }));
    }, 500);

    const sem = new Semaphore(config.maxConcurrency);

    for (const delayMs of delays) {
      if (!aliveRef.current) break;

      // Wait while paused
      while (pausedRef.current && aliveRef.current) {
        await sleep(100);
      }
      if (!aliveRef.current) break;

      if (delayMs > 0) await sleep(delayMs);
      if (!aliveRef.current) break;

      firedRef.current++;
      const payload = buildOrderPayload(config.scenario, config.symbols, config.accountId, duplicateKey);
      const t0 = Date.now();

      sem.acquire().then(async () => {
        try {
          const res = await fetch(`${API_BASE}/api/v1/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
            },
            body: JSON.stringify(payload),
          });

          const latencyMs = Date.now() - t0;
          const body = await res.json().catch(() => ({})) as Record<string, unknown>;
          let update: StatUpdate;
          let rowStatus: FeedRow['status'];
          let errorMsg: string | undefined;

          if (res.status === 201 || res.status === 200) {
            const orderStatus = body['status'] as string | undefined;
            if (orderStatus === 'FILLED') {
              update = { type: 'filled', latencyMs };
              rowStatus = 'FILLED';
            } else if (orderStatus === 'REJECTED') {
              const reason = (body['rejectionReason'] as string | undefined) ?? 'REJECTED';
              update = { type: 'rejected', errorKey: `${res.status}|${reason}` };
              rowStatus = 'REJECTED';
              errorMsg = reason;
            } else {
              update = { type: 'accepted' };
              rowStatus = 'ACCEPTED';
            }
          } else if (res.status === 422 || res.status === 400) {
            const reason = (body['message'] as string | undefined) ?? String(res.status);
            update = { type: 'rejected', errorKey: `${res.status}|${reason}` };
            rowStatus = 'REJECTED';
            errorMsg = reason;
          } else {
            const reason = (body['message'] as string | undefined) ?? String(res.status);
            update = { type: 'errored', errorKey: `${res.status}|${reason}` };
            rowStatus = 'ERROR';
            errorMsg = reason;
          }

          statsRef.current = applyUpdate(statsRef.current, update);

          const row: FeedRow = {
            id: crypto.randomUUID(),
            ts: t0,
            symbol: payload.symbol,
            side: payload.side,
            quantity: payload.quantity,
            status: rowStatus,
            latencyMs,
            errorMessage: errorMsg,
          };
          feedRef.current = [...feedRef.current.slice(-MAX_FEED + 1), row];
        } catch {
          const latencyMs = Date.now() - t0;
          statsRef.current = applyUpdate(statsRef.current, { type: 'errored', errorKey: 'network|ERR' });
          const row: FeedRow = {
            id: crypto.randomUUID(),
            ts: t0,
            symbol: payload.symbol,
            side: payload.side,
            quantity: payload.quantity,
            status: 'ERROR',
            latencyMs,
            errorMessage: 'Network error',
          };
          feedRef.current = [...feedRef.current.slice(-MAX_FEED + 1), row];
        } finally {
          sem.release();
        }
      });
    }

    // Wait for all in-flight to drain
    for (let i = 0; i < config.maxConcurrency; i++) await sem.acquire();

    if (aliveRef.current) {
      aliveRef.current = false;
      stopElapsedTimer();
      flush();
      setState((prev) => ({ ...prev, status: 'stopped' }));
    }
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState((prev) => ({ ...prev, status: 'paused' }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setState((prev) => ({ ...prev, status: 'running' }));
  }, []);

  const stop = useCallback(() => {
    aliveRef.current = false;
    pausedRef.current = false;
    stopElapsedTimer();
    flush();
    setState((prev) => ({ ...prev, status: 'stopped' }));
  }, []);

  const reset = useCallback(() => {
    aliveRef.current = false;
    pausedRef.current = false;
    stopElapsedTimer();
    statsRef.current = emptyStats();
    feedRef.current = [];
    firedRef.current = 0;
    setState({
      status: 'idle',
      stats: emptyStats(),
      feed: [],
      fired: 0,
      total: null,
      elapsedMs: 0,
      rateLimitWarning: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      aliveRef.current = false;
      stopElapsedTimer();
    };
  }, []);

  return { state, start, pause, resume, stop, reset };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
