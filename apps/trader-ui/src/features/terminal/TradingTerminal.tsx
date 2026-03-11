import { useState, useMemo } from 'react';
import { WatchlistPanel } from '../watchlist/WatchlistPanel';
import { OrderTicketPanel } from '../orders/OrderTicketPanel';
import { BlotterPanel } from '../orders/BlotterPanel';
import { PositionsPanel } from '../portfolio/PositionsPanel';
import { useMarketStream } from '../watchlist/useMarketStream';
import { createApiClient } from '../../api/client';

const API_BASE_URL =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'http://localhost:3010';
const STREAM_URL =
  (import.meta.env['VITE_STREAM_URL'] as string | undefined) ?? 'ws://localhost:3016/stream';

type BottomTab = 'blotter' | 'positions';

interface TradingTerminalProps {
  token: string;
  accountId: string | null;
}

function useWsStatus(url: string): 'connected' | 'disconnected' {
  const snapshot = useMarketStream(url);
  return Object.keys(snapshot).length > 0 ? 'connected' : 'disconnected';
}

export function TradingTerminal({ token, accountId }: TradingTerminalProps) {
  const [activeTab, setActiveTab] = useState<BottomTab>('blotter');
  const wsStatus = useWsStatus(STREAM_URL);

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
          {wsStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">Connected</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-xs text-red-400">Disconnected</span>
            </>
          )}
        </div>
      </header>

      {/* Top row */}
      <div className="flex flex-1 min-h-0 border-b border-zinc-700">
        {/* Watchlist ~35% */}
        <div className="w-[35%] border-r border-zinc-700 overflow-hidden">
          <WatchlistPanel />
        </div>
        {/* Order Ticket ~65% */}
        <div className="flex-1 overflow-hidden">
          <OrderTicketPanel
            client={client}
            accountId={accountId ?? ''}
          />
        </div>
      </div>

      {/* Bottom row: tabbed blotter / positions */}
      <div className="h-64 flex flex-col flex-shrink-0">
        {/* Tab bar */}
        <div className="bg-zinc-800 border-b border-zinc-700 flex items-center px-3 gap-1">
          <button
            role="tab"
            aria-selected={activeTab === 'blotter'}
            onClick={() => setActiveTab('blotter')}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('blotter')}
            className={`px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              activeTab === 'blotter'
                ? 'text-white border-b-2 border-blue-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Blotter
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'positions'}
            onClick={() => setActiveTab('positions')}
            onKeyDown={(e) => e.key === 'Enter' && setActiveTab('positions')}
            className={`px-3 py-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              activeTab === 'positions'
                ? 'text-white border-b-2 border-blue-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Positions
          </button>
        </div>

        {/* Tab content */}
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
