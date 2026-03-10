import { useEffect, useReducer, useRef } from 'react';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

export interface MarketTick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
}

export type WatchlistSnapshot = Record<string, MarketTick>;

type Action = { type: 'TICK'; payload: MarketTick };

function reducer(state: WatchlistSnapshot, action: Action): WatchlistSnapshot {
  if (action.type === 'TICK') {
    // Replace existing entry for the symbol — prevents stale state accumulation
    return { ...state, [action.payload.symbol]: action.payload };
  }
  return state;
}

export function useMarketStream(url: string): WatchlistSnapshot {
  const [snapshot, dispatch] = useReducer(reducer, {});
  const subjectRef = useRef<WebSocketSubject<MarketTick> | null>(null);

  useEffect(() => {
    let alive = true;
    let retryDelay = 1000;

    function connect() {
      if (!alive) return;

      const subject = webSocket<MarketTick>(url);
      subjectRef.current = subject;

      subject.subscribe({
        next: (tick) => {
          retryDelay = 1000;
          dispatch({ type: 'TICK', payload: tick });
        },
        error: () => {
          if (!alive) return;
          setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30_000);
            connect();
          }, retryDelay);
        },
        complete: () => {
          if (!alive) return;
          setTimeout(connect, retryDelay);
        },
      });
    }

    connect();

    return () => {
      alive = false;
      subjectRef.current?.complete();
    };
  }, [url]);

  return snapshot;
}
