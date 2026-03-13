import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { usePositionsQuery } from './hooks/usePositionsQuery';
import { useMarketStream } from './hooks/useMarketStream';
import { useTickHistory } from './hooks/useTickHistory';
import { computeSummary, sortPositions, pctReturn } from './lib/portfolioCalc';
import { downloadCsv } from './lib/csvExport';
import { Sparkline } from './components/Sparkline';
import { PnlChart } from './components/PnlChart';
import type { SortKey, SortState } from './lib/portfolioCalc';
import type { PnlPoint } from './components/PnlChart';
import type { ShellState } from './types/store';
import type { UTCTimestamp } from 'lightweight-charts';

const STREAM_URL =
  (import.meta.env['VITE_STREAM_URL'] as string | undefined) ?? 'ws://localhost:3016/stream';

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function PortfolioPage() {
  const theme = useTheme();
  const token = useSelector((s: ShellState) => s.auth.token) ?? '';

  const [symbolFilter, setSymbolFilter] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'symbol', direction: 'asc' });
  const [pnlHistory, setPnlHistory] = useState<PnlPoint[]>([]);

  const { data, isLoading, isError, error } = usePositionsQuery();

  const positions = data?.positions ?? [];
  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);

  const { snapshot } = useMarketStream({ url: STREAM_URL, token, symbols });
  const tickHistory = useTickHistory(snapshot);

  // Append to aggregate PnL history on each refetch (5-min rolling window)
  useEffect(() => {
    if (!data) return;
    const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
    const cutoff = (now - 300) as UTCTimestamp;
    setPnlHistory((prev) => {
      const filtered = prev.filter((p) => p.time >= cutoff);
      const last = filtered[filtered.length - 1];
      if (last && last.time === now) return filtered;
      return [...filtered, { time: now, value: data.totalUnrealizedPnl }];
    });
  }, [data]);

  function handleSort(key: SortKey) {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  const filteredSorted = useMemo(() => {
    const filtered = symbolFilter
      ? positions.filter((p) =>
          p.symbol.includes(symbolFilter.toUpperCase().trim()),
        )
      : positions;
    return sortPositions(filtered, sort);
  }, [positions, symbolFilter, sort]);

  const summary = useMemo(() => computeSummary(positions), [positions]);

  const pnlColour = (val: number) => {
    const trading = (theme.palette as unknown as { trading?: { uptick: string; downtick: string } }).trading;
    if (val > 0) return trading?.uptick ?? theme.palette.success.main;
    if (val < 0) return trading?.downtick ?? theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!isLoading && !isError && positions.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom tabIndex={-1}>
          Portfolio
        </Typography>
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={2}
          sx={{ flex: 1 }}
          aria-label="No open positions"
        >
          <ShowChartIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary">
            No open positions
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Place your first order to see your portfolio here.
          </Typography>
          <Button variant="contained" href="/terminal">
            Go to Trading Terminal
          </Button>
        </Stack>
      </Box>
    );
  }

  function SortableHeader({
    label,
    sortKey,
    align = 'right',
  }: {
    label: string;
    sortKey: SortKey;
    align?: 'left' | 'right';
  }) {
    return (
      <TableCell
        align={align}
        sortDirection={sort.key === sortKey ? sort.direction : false}
      >
        <TableSortLabel
          active={sort.key === sortKey}
          direction={sort.key === sortKey ? sort.direction : 'asc'}
          onClick={() => handleSort(sortKey)}
        >
          {label}
        </TableSortLabel>
      </TableCell>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', p: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom tabIndex={-1}>
        Portfolio
      </Typography>

      {/* ── Account summary ────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          spacing={4}
          divider={<Divider orientation="vertical" flexItem />}
          flexWrap="wrap"
          aria-label="portfolio summary"
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Open Positions
            </Typography>
            <Typography variant="h6" aria-label={`Open positions: ${summary.positionCount}`}>
              {isLoading ? <Skeleton width={40} /> : summary.positionCount}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Market Value
            </Typography>
            <Typography
              variant="h6"
              aria-label={`Total market value: $${fmt(summary.totalMarketValue)}`}
            >
              {isLoading ? <Skeleton width={80} /> : `$${fmt(summary.totalMarketValue)}`}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Unrealized P&L
            </Typography>
            <Typography
              variant="h6"
              sx={{ color: pnlColour(summary.totalUnrealizedPnl) }}
              aria-label={`Total unrealized PnL`}
            >
              {isLoading ? (
                <Skeleton width={80} />
              ) : (
                `${summary.totalUnrealizedPnl >= 0 ? '+' : ''}${fmt(summary.totalUnrealizedPnl)}`
              )}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load positions
          {error instanceof Error ? `: ${error.message}` : ''}
        </Alert>
      )}

      {/* ── Table toolbar ───────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <TextField
          size="small"
          label="Filter symbols"
          inputProps={{ 'aria-label': 'filter symbols' }}
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          sx={{ width: 180 }}
        />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Export CSV">
          <span>
            <IconButton
              aria-label="export positions as CSV"
              onClick={() => downloadCsv(filteredSorted)}
              disabled={filteredSorted.length === 0}
            >
              <DownloadIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* ── Positions table ─────────────────────────────────────────────────── */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small" aria-label="positions table">
          <TableHead>
            <TableRow>
              <SortableHeader label="Symbol" sortKey="symbol" align="left" />
              <SortableHeader label="Quantity" sortKey="quantity" />
              <SortableHeader label="Avg Cost" sortKey="averageCost" />
              <SortableHeader label="Market Price" sortKey="marketPrice" />
              <SortableHeader label="Unrealized P&L" sortKey="unrealizedPnl" />
              <SortableHeader label="% Return" sortKey="pctReturn" />
              <TableCell align="center">Trend</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : filteredSorted.map((p) => {
                  const ret = pctReturn(p);
                  const history = tickHistory.get(p.symbol) ?? [];
                  return (
                    <TableRow key={p.symbol} hover>
                      <TableCell>{p.symbol}</TableCell>
                      <TableCell align="right">{p.quantity}</TableCell>
                      <TableCell align="right">{fmt(p.averageCost)}</TableCell>
                      <TableCell align="right">{fmt(p.marketPrice)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: pnlColour(p.unrealizedPnl) }}
                        aria-label={`${p.symbol} unrealized PnL`}
                      >
                        {p.unrealizedPnl >= 0 ? '+' : ''}{fmt(p.unrealizedPnl)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: pnlColour(ret) }}
                        aria-label={`${p.symbol} return`}
                      >
                        {ret >= 0 ? '+' : ''}{fmt(ret)}%
                      </TableCell>
                      <TableCell align="center" sx={{ p: 0.5 }}>
                        {history.length >= 2 ? (
                          <Sparkline data={history} width={120} height={36} />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Aggregate PnL chart ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1 }}>
        <PnlChart data={pnlHistory} height={140} />
      </Paper>
    </Box>
  );
}
