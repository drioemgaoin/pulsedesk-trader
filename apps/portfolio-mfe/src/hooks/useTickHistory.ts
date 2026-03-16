import { useEffect, useReducer, useRef } from 'react';
import type { WatchlistSnapshot } from './useMarketStream';

type HistoryMap = Map<string, number[]>;

/** Returns a rolling buffer of the last `maxLength` mid-prices per symbol. */
export function useTickHistory(
  snapshot: WatchlistSnapshot,
  maxLength = 60,
): HistoryMap {
  const historyRef = useRef<HistoryMap>(new Map());
  const prevTimestampsRef = useRef<Record<string, string>>({});
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    let changed = false;

    for (const [symbol, tick] of Object.entries(snapshot)) {
      const prevTs = prevTimestampsRef.current[symbol];
      if (prevTs !== tick.timestamp) {
        prevTimestampsRef.current[symbol] = tick.timestamp;
        const mid = (tick.bid + tick.ask) / 2;
        const buf = historyRef.current.get(symbol) ?? [];
        const next = buf.length >= maxLength ? [...buf.slice(-(maxLength - 1)), mid] : [...buf, mid];
        historyRef.current.set(symbol, next);
        changed = true;
      }
    }

    if (changed) forceUpdate();
  }, [snapshot, maxLength]);

  // eslint-disable-next-line react-hooks/refs
  return historyRef.current;
}
