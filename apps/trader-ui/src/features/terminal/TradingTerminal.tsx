import { useState, useMemo, useEffect, useRef } from 'react';
import { WatchlistPanel } from '../watchlist/WatchlistPanel';
import { ChartPanel } from '../chart/ChartPanel';
import { OrderTicketPanel } from '../orders/OrderTicketPanel';
import { BlotterPanel } from '../orders/BlotterPanel';
import { PositionsPanel } from '../portfolio/PositionsPanel';
import { useMarketStream } from '../watchlist/useMarketStream';
import { createApiClient } from '../../api/client';
import type { MarketTick, WsStatus } from '../watchlist/useMarketStream';

const API_BASE_URL =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'http://localhost:3010';
const STREAM_URL =
  (import.meta.env['VITE_STREAM_URL'] as string | undefined) ?? 'ws://localhost:3016/stream';
const RAW_SYMBOLS =
  (import.meta.env['VITE_WATCHLIST_SYMBOLS'] as string | undefined) ?? 'AAPL,TSLA,MSFT,NVDA,AMZN';
const WATCHLIST_SYMBOLS = RAW_SYMBOLS.split(',').map((s) => s.trim()).filter(Boolean);

type BottomTab = 'blotter' | 'positions';

interface TradingTerminalProps {
  token: string;
  accountId: string | null;
}

/** Throttle a value to at most one update per `limitMs`. Leading + trailing. */
function useThrottledValue<T>(value: T, limitMs: number): T {
  const [throttled, setThrottled] = useState<T>(value);
  const lastSetAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastSetAt.current;

    if (elapsed >= limitMs) {
      if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
      lastSetAt.current = now;
      // Defer setState out of the synchronous effect body (leading edge)
      timer.current = setTimeout(() => { setThrottled(value); timer.current = null; }, 0);
    } else {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        lastSetAt.current = Date.now();
        setThrottled(value);
        timer.current = null;
      }, limitMs - elapsed);
    }

    return () => {
      if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
    };
  }, [value, limitMs]);

  return throttled;
}

const STATUS_DOT: Record<WsStatus, string> = {
  connected: 'bg-green-400 animate-pulse',
  connecting: 'bg-amber-400',
  reconnecting: 'bg-amber-400 animate-spin',
};

const STATUS_TEXT: Record<WsStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
};

const STATUS_COLOR: Record<WsStatus, string> = {
  connected: 'text-green-400',
  connecting: 'text-amber-400',
  reconnecting: 'text-amber-400',
};

export function TradingTerminal({ token, accountId }: TradingTerminalProps) {
  const [activeTab, setActiveTab] = useState<BottomTab>('blotter');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { snapshot, status } = useMarketStream({
    url: STREAM_URL,
    token,
    symbols: WATCHLIST_SYMBOLS,
  });

  const selectedTick: MarketTick | null = selectedSymbol ? (snapshot[selectedSymbol] ?? null) : null;
  const throttledTick = useThrottledValue(selectedTick, 100);

  const client = useMemo(() => createApiClient(API_BASE_URL, token), [token]);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-900 text-white overflow-hidden">
      {/* Header bar */}
      <header className="bg-zinc-800 border-b border-zinc-700 px-4 py-2 flex items-center gap-4 flex-shrink-0">
        <h1 className="text-sm font-semibold text-white">PulseDesk Trader</h1>
        <div className="flex-1" />
        {accountId && (
          <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-1 rounded">
            Account: {accountId}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
          <span className={`text-xs ${STATUS_COLOR[status]}`}>{STATUS_TEXT[status]}</span>
        </div>
      </header>

      {/* Top row: Watchlist 22% | Chart 43% | Order Ticket 35% */}
      <div className="flex flex-1 min-h-0 border-b border-zinc-700">
        <div className="w-[22%] border-r border-zinc-700 overflow-hidden">
          <WatchlistPanel
            snapshot={snapshot}
            status={status}
            selectedSymbol={selectedSymbol}
            onSymbolSelect={setSelectedSymbol}
          />
        </div>
        <div className="w-[43%] border-r border-zinc-700 overflow-hidden">
          <ChartPanel
            symbol={selectedSymbol}
            tick={throttledTick}
            streamStatus={status}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <OrderTicketPanel
            client={client}
            accountId={accountId ?? ''}
            selectedSymbol={selectedSymbol ?? undefined}
          />
        </div>
      </div>

      {/* Bottom row: tabbed blotter / positions */}
      <div className="h-64 flex flex-col flex-shrink-0">
        <div
          role="tablist"
          aria-label="Bottom panels"
          className="bg-zinc-800 border-b border-zinc-700 flex items-center px-3 gap-1"
        >
          {(['blotter', 'positions'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              onKeyDown={(e) => e.key === 'Enter' && setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'blotter' ? 'Blotter' : 'Positions'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'blotter' ? (
            <BlotterPanel client={client} accountId={accountId ?? ''} />
          ) : (
            <PositionsPanel client={client} accountId={accountId ?? ''} />
          )}
        </div>
      </div>
    </div>
  );
}
