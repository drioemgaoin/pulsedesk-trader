import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { MarketTick, WatchlistSnapshot, WsStatus } from './useMarketStream';

interface WatchlistPanelProps {
  snapshot: WatchlistSnapshot;
  status: WsStatus;
  selectedSymbol: string | null;
  onSymbolSelect: (symbol: string) => void;
}

type FlashDir = 'up' | 'down' | null;

function useTickFlash(snapshot: WatchlistSnapshot): Record<string, FlashDir> {
  const prevRef = useRef<Record<string, number>>({});
  const [flash, setFlash] = useState<Record<string, FlashDir>>({});

  useEffect(() => {
    const updates: Record<string, FlashDir> = {};
    for (const [sym, tick] of Object.entries(snapshot)) {
      const prev = prevRef.current[sym];
      if (prev !== undefined && tick.last !== prev) {
        updates[sym] = tick.last > prev ? 'up' : 'down';
      }
      prevRef.current[sym] = tick.last;
    }
    if (Object.keys(updates).length === 0) return;

    // Defer the leading setState out of the synchronous effect body
    const leadId = setTimeout(() => setFlash((f) => ({ ...f, ...updates })), 0);
    const trailId = setTimeout(() => {
      setFlash((f) => {
        const next = { ...f };
        for (const sym of Object.keys(updates)) delete next[sym];
        return next;
      });
    }, 600);
    return () => { clearTimeout(leadId); clearTimeout(trailId); };
  }, [snapshot]);

  return flash;
}

function flashClass(dir: FlashDir): string {
  if (dir === 'up') return 'text-green-400 transition-colors duration-600';
  if (dir === 'down') return 'text-red-400 transition-colors duration-600';
  return 'text-zinc-300';
}

const STATUS_DOT: Record<WsStatus, string> = {
  connected: 'bg-green-400 animate-pulse',
  connecting: 'bg-amber-400',
  reconnecting: 'bg-amber-400 animate-spin',
};

const STATUS_LABEL: Record<WsStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
};

export function WatchlistPanel({ snapshot, status, selectedSymbol, onSymbolSelect }: WatchlistPanelProps) {
  const [search, setSearch] = useState('');
  const flash = useTickFlash(snapshot);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const allTicks = Object.values(snapshot).sort((a, b) => a.symbol.localeCompare(b.symbol));
  const ticks = search
    ? allTicks.filter((t) => t.symbol.startsWith(search.toUpperCase()))
    : allTicks;

  function handleRowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, tick: MarketTick, idx: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSymbolSelect(tick.symbol);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      rowRefs.current[idx + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx === 0) searchRef.current?.focus();
      else rowRefs.current[idx - 1]?.focus();
    } else if (e.key === 'Escape') {
      setSearch('');
      searchRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-2 flex items-center gap-2">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Watchlist</h2>
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`}
          aria-label={STATUS_LABEL[status]}
          title={STATUS_LABEL[status]}
        />
        <input
          ref={searchRef}
          type="search"
          aria-label="Filter symbols"
          placeholder="Filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearch('');
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              rowRefs.current[0]?.focus();
            }
          }}
          className="ml-auto w-20 bg-zinc-700 border border-zinc-600 rounded px-2 py-0.5 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {status === 'connecting' && ticks.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-500">Connecting to market stream…</p>
        ) : status === 'reconnecting' && ticks.length === 0 ? (
          <p className="px-3 py-4 text-xs text-amber-400">⚠ Reconnecting…</p>
        ) : ticks.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-500">
            {search ? 'No symbols match filter.' : 'No symbols configured.'}
          </p>
        ) : (
          <table className="w-full text-xs border-collapse" role="grid" aria-label="Watchlist">
            <thead className="sticky top-0 bg-zinc-900">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-zinc-500 font-medium">Symbol</th>
                <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Bid</th>
                <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Ask</th>
                <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Last</th>
                <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Vol</th>
              </tr>
            </thead>
            <tbody>
              {ticks.map((tick, idx) => {
                const isSelected = tick.symbol === selectedSymbol;
                const dir = flash[tick.symbol] ?? null;
                return (
                  <tr
                    key={tick.symbol}
                    ref={(el) => { rowRefs.current[idx] = el; }}
                    role="row"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => onSymbolSelect(tick.symbol)}
                    onKeyDown={(e) => handleRowKeyDown(e, tick, idx)}
                    className={`border-t border-zinc-800 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                      isSelected
                        ? 'bg-blue-900/20 ring-1 ring-inset ring-blue-500/40'
                        : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <td className="px-3 py-1.5 font-medium text-zinc-200">{tick.symbol}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${flashClass(dir)}`}>
                      {tick.bid.toFixed(2)}
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${flashClass(dir)}`}>
                      {tick.ask.toFixed(2)}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right tabular-nums font-medium ${flashClass(dir)}`}
                      aria-label={`${tick.symbol} last price ${tick.last.toFixed(2)}, ${dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'unchanged'}`}
                    >
                      {tick.last.toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-400 tabular-nums">
                      {tick.volume.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
