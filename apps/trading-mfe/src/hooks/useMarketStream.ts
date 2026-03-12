import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { webSocket } from 'rxjs/webSocket';

export interface MarketTick {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
}

export type WatchlistSnapshot = Record<string, MarketTick>;
export type WsStatus = 'connecting' | 'connected' | 'reconnecting';

type Action = { type: 'TICK'; payload: MarketTick };

function reducer(state: WatchlistSnapshot, action: Action): WatchlistSnapshot {
  if (action.type === 'TICK') {
    return { ...state, [action.payload.symbol]: action.payload };
  }
  return state;
}

function isMarketTick(msg: unknown): msg is MarketTick {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>)['eventType'] === 'market.tick'
  );
}

export interface UseMarketStreamOptions {
  url: string;
  token: string;
  symbols: string[];
}

export interface UseMarketStreamResult {
  snapshot: WatchlistSnapshot;
  status: WsStatus;
}

export function useMarketStream({ url, token, symbols }: UseMarketStreamOptions): UseMarketStreamResult {
  const [snapshot, dispatch] = useReducer(reducer, {});
  const [status, setStatus] = useState<WsStatus>('connecting');

  const symbolsRef = useRef(symbols);
  useLayoutEffect(() => { symbolsRef.current = symbols; });

  useEffect(() => {
    let alive = true;
    let retryDelay = 1000;

    function connect() {
      if (!alive) return;
      setStatus('connecting');

      const wsUrl = `${url}?token=${encodeURIComponent(token)}`;

      const subject = webSocket<unknown>({
        url: wsUrl,
        openObserver: {
          next: () => {
            subject.next({ event: 'subscribe', data: { symbols: symbolsRef.current } });
          },
        },
      });

      subject.subscribe({
        next: (msg) => {
          if (!alive) return;
          retryDelay = 1000;
          if (isMarketTick(msg)) {
            setStatus('connected');
            dispatch({ type: 'TICK', payload: msg });
          }
        },
        error: () => {
          if (!alive) return;
          setStatus('reconnecting');
          setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30_000);
            connect();
          }, retryDelay);
        },
        complete: () => {
          if (!alive) return;
          setStatus('reconnecting');
          setTimeout(connect, retryDelay);
        },
      });

      return subject;
    }

    const sub = connect();

    return () => {
      alive = false;
      sub?.complete();
    };
  }, [url, token]);

  return { snapshot, status };
}
