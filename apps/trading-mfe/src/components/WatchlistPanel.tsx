import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  InputAdornment,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { MarketTick, WatchlistSnapshot, WsStatus } from '../hooks/useMarketStream';
import type { ShellState } from '../types/store';
import { setSelectedSymbol } from '../store/terminalActions';

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

    const leadId = setTimeout(() => setFlash((f) => ({ ...f, ...updates })), 0);
    const trailId = setTimeout(() => {
      setFlash((f) => {
        const next = { ...f };
        for (const sym of Object.keys(updates)) delete next[sym];
        return next;
      });
    }, 600);
    return () => {
      clearTimeout(leadId);
      clearTimeout(trailId);
    };
  }, [snapshot]);

  return flash;
}

const WS_STATUS_COLOR: Record<WsStatus, 'success' | 'warning' | 'disabled'> = {
  connected: 'success',
  connecting: 'warning',
  reconnecting: 'warning',
};

const WS_STATUS_LABEL: Record<WsStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
};

interface WatchlistPanelProps {
  snapshot: WatchlistSnapshot;
  status: WsStatus;
  isLoading?: boolean;
}

export function WatchlistPanel({ snapshot, status, isLoading }: WatchlistPanelProps) {
  const dispatch = useDispatch();
  const selectedSymbol = useSelector((s: ShellState) => s.terminal.selectedSymbol);
  const [search, setSearch] = useState('');
  const flash = useTickFlash(snapshot);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const allTicks = Object.values(snapshot).sort((a, b) => a.symbol.localeCompare(b.symbol));
  const ticks = search
    ? allTicks.filter((t) => t.symbol.startsWith(search.toUpperCase()))
    : allTicks;

  const handleSelect = (symbol: string) => {
    dispatch(setSelectedSymbol(symbol));
  };

  function handleRowKeyDown(e: KeyboardEvent<HTMLTableRowElement>, tick: MarketTick, idx: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(tick.symbol);
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Watchlist
        </Typography>
        <Tooltip title={WS_STATUS_LABEL[status]}>
          <FiberManualRecordIcon
            color={WS_STATUS_COLOR[status]}
            sx={{ fontSize: 8 }}
            aria-label={WS_STATUS_LABEL[status]}
          />
        </Tooltip>
        <TextField
          inputRef={searchRef}
          size="small"
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
          inputProps={{ 'aria-label': 'Filter symbols' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ ml: 'auto', width: 100 }}
        />
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading && ticks.length === 0 ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={28} sx={{ mb: 0.5 }} />
            ))}
          </Box>
        ) : ticks.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 2 }}>
            {search ? 'No symbols match filter.' : 'Waiting for market data…'}
          </Typography>
        ) : (
          <Table size="small" aria-label="Watchlist" role="grid">
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell align="right">Bid</TableCell>
                <TableCell align="right">Ask</TableCell>
                <TableCell align="right">Last</TableCell>
                <TableCell align="right">Vol</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ticks.map((tick, idx) => {
                const isSelected = tick.symbol === selectedSymbol;
                const dir = flash[tick.symbol] ?? null;
                const flashColor =
                  dir === 'up'
                    ? 'trading.uptick'
                    : dir === 'down'
                    ? 'trading.downtick'
                    : 'text.primary';

                return (
                  <TableRow
                    key={tick.symbol}
                    ref={(el) => { rowRefs.current[idx] = el; }}
                    role="row"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => handleSelect(tick.symbol)}
                    onKeyDown={(e) => handleRowKeyDown(e, tick, idx)}
                    selected={isSelected}
                    hover
                    sx={{
                      cursor: 'pointer',
                      outline: 'none',
                      '&:focus-visible': { boxShadow: (t) => `inset 0 0 0 2px ${t.palette.primary.main}` },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{tick.symbol}</TableCell>
                    <TableCell align="right" sx={{ color: flashColor, fontVariantNumeric: 'tabular-nums', transition: 'color 0.6s' }}>
                      {tick.bid.toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: flashColor, fontVariantNumeric: 'tabular-nums', transition: 'color 0.6s' }}>
                      {tick.ask.toFixed(2)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: flashColor, fontWeight: 500, fontVariantNumeric: 'tabular-nums', transition: 'color 0.6s' }}
                      aria-label={`${tick.symbol} last price ${tick.last.toFixed(2)}, ${dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'unchanged'}`}
                    >
                      {tick.last.toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {tick.volume.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
