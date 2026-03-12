import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Tab, Tabs } from '@mui/material';
import { WatchlistPanel } from './components/WatchlistPanel';
import { ChartPanel } from './components/ChartPanel';
import { OrderTicketPanel } from './components/OrderTicketPanel';
import { BlotterPanel } from './components/BlotterPanel';
import { PositionsPanel } from './components/PositionsPanel';
import { useMarketStream } from './hooks/useMarketStream';
import { useWatchlistQuery } from './hooks/useWatchlistQuery';
import { setConnectionStatus } from './store/terminalActions';
import type { MarketTick } from './hooks/useMarketStream';
import type { ShellState } from './types/store';

const STREAM_URL =
  (import.meta.env['VITE_STREAM_URL'] as string | undefined) ?? 'ws://localhost:3016/stream';

type BottomTab = 'blotter' | 'positions';

/** Throttle a value to at most one update per limitMs. Leading + trailing. */
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

export default function TradingTerminalPage() {
  const [activeTab, setActiveTab] = useState<BottomTab>('blotter');
  const dispatch = useDispatch();

  const token = useSelector((s: ShellState) => s.auth.token) ?? '';
  const accountId = useSelector((s: ShellState) => s.auth.accountId) ?? '';
  const selectedSymbol = useSelector((s: ShellState) => s.terminal.selectedSymbol);

  const { data: symbols = [] } = useWatchlistQuery();

  const { snapshot, status } = useMarketStream({
    url: STREAM_URL,
    token,
    symbols,
  });

  // Sync WS status into Redux for AppShell header status indicator
  useEffect(() => {
    const mapped =
      status === 'connected' ? 'connected' : status === 'reconnecting' ? 'disconnected' : 'connecting';
    dispatch(setConnectionStatus(mapped));
  }, [status, dispatch]);

  const selectedTick: MarketTick | null = selectedSymbol ? (snapshot[selectedSymbol] ?? null) : null;
  const throttledTick = useThrottledValue(selectedTick, 100);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top row: Watchlist 22% | Chart 43% | Order Ticket 35% */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ width: '22%', borderRight: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <WatchlistPanel
            snapshot={snapshot}
            status={status}
          />
        </Box>
        <Box sx={{ width: '43%', borderRight: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <ChartPanel
            symbol={selectedSymbol || null}
            tick={throttledTick}
            streamStatus={status}
          />
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <OrderTicketPanel />
        </Box>
      </Box>

      {/* Bottom row: tabbed blotter / positions */}
      <Box sx={{ height: 264, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v: BottomTab) => setActiveTab(v)}
          aria-label="Bottom panels"
          sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Tab value="blotter" label="Blotter" sx={{ minHeight: 36 }} />
          <Tab value="positions" label="Positions" sx={{ minHeight: 36 }} />
        </Tabs>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'blotter' ? (
            <BlotterPanel accountId={accountId} />
          ) : (
            <PositionsPanel accountId={accountId} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
