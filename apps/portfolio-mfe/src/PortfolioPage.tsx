import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Tooltip,
  Typography,
  useTheme,
  DownloadIcon,
  ShowChartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  SearchField,
  tableRowSx,
} from '@pulsedesk/ui';
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

// ── SortableHeader — declared at module scope to prevent recreation on every render ──
interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  align?: 'left' | 'right';
  tooltip?: string;
  sx?: object;
  sort: SortState;
  onSort: (key: SortKey) => void;
}

function SortableHeader({ label, sortKey, align = 'right', tooltip, sx: extraSx, sort, onSort }: SortableHeaderProps) {
  return (
    <TableCell
      align={align}
      sortDirection={sort.key === sortKey ? sort.direction : false}
      sx={{
        fontSize: '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        py: 1,
        ...extraSx,
      }}
    >
      <TableSortLabel
        active={sort.key === sortKey}
        direction={sort.key === sortKey ? sort.direction : 'asc'}
        onClick={() => onSort(sortKey)}
      >
        {tooltip ? (
          <Tooltip title={tooltip} placement="top">
            <span aria-label={label}>{label}</span>
          </Tooltip>
        ) : label}
      </TableSortLabel>
    </TableCell>
  );
}

function fmtPnl(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}`;
}

export default function PortfolioPage() {
  const theme = useTheme();
  const token = useSelector((s: ShellState) => s.auth.token) ?? '';

  const [symbolFilter, setSymbolFilter] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'symbol', direction: 'asc' });
  const [pnlHistory, setPnlHistory] = useState<PnlPoint[]>([]);

  const { data, isLoading, isError, error } = usePositionsQuery();

  const positions = useMemo(() => data?.positions ?? [], [data]);
  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);

  const { snapshot } = useMarketStream({ url: STREAM_URL, token, symbols });
  const tickHistory = useTickHistory(snapshot);

  useEffect(() => {
    if (!data) return;
    const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
    const cutoff = (now - 300) as UTCTimestamp;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      ? positions.filter((p) => p.symbol.includes(symbolFilter.toUpperCase().trim()))
      : positions;
    return sortPositions(filtered, sort);
  }, [positions, symbolFilter, sort]);

  const summary = useMemo(() => computeSummary(positions), [positions]);

  const trading = (theme.palette as unknown as { trading?: { uptick: string; downtick: string } }).trading;
  const pnlColour = (val: number) => {
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
          <Button variant="contained" component={RouterLink} to="/trading">
            Go to Trading Terminal
          </Button>
        </Stack>
      </Box>
    );
  }

  const pnlIsPositive = summary.totalUnrealizedPnl > 0;
  const pnlIsNegative = summary.totalUnrealizedPnl < 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Hero P&L banner — the #1 metric traders care about ── */}
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'var(--pd-bg-surface)',
          flexShrink: 0,
        }}
      >
        <Typography variant="h5" component="h1" tabIndex={-1} sx={{ mb: 1 }}>
          Portfolio
        </Typography>
        <Tooltip title="Total gain or loss if all open positions were closed at current market prices" placement="right">
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.1em', cursor: 'default', display: 'inline-block' }}>
            Unrealized P&amp;L
          </Typography>
        </Tooltip>

        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.5 }}>
          {isLoading ? (
            <Skeleton width={200} height={56} />
          ) : (
            <>
              {pnlIsPositive && (
                <TrendingUpIcon sx={{ fontSize: 32, color: pnlColour(summary.totalUnrealizedPnl) }} />
              )}
              {pnlIsNegative && (
                <TrendingDownIcon sx={{ fontSize: 32, color: pnlColour(summary.totalUnrealizedPnl) }} />
              )}
              <Typography
                variant="h3"
                component="span"
                aria-label="Total unrealized PnL"
                sx={{
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: pnlColour(summary.totalUnrealizedPnl),
                  lineHeight: 1,
                }}
              >
                {fmtPnl(summary.totalUnrealizedPnl)}
              </Typography>
            </>
          )}
        </Stack>

        {/* Supporting stats row */}
        <Stack
          direction="row"
          spacing={4}
          divider={<Divider orientation="vertical" flexItem />}
          sx={{ mt: 2 }}
          aria-label="portfolio summary"
          flexWrap="wrap"
        >
          <Box>
            <Tooltip title="Number of currently open trading positions" placement="top">
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'default' }}>Open Positions</Typography>
            </Tooltip>
            <Typography variant="body1" fontWeight={600} aria-label={`Open positions: ${summary.positionCount}`}>
              {isLoading ? <Skeleton width={24} /> : summary.positionCount}
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Total current market value of all open positions" placement="top">
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'default' }}>Market Value</Typography>
            </Tooltip>
            <Typography variant="body1" fontWeight={600} aria-label={`Total market value: $${fmt(summary.totalMarketValue)}`}>
              {isLoading ? <Skeleton width={80} /> : `$${fmt(summary.totalMarketValue)}`}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Content — fixed flex column so the table fills remaining height ── */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 2, gap: 2 }}>

        {/* Error */}
        {isError && (
          <Alert severity="error" sx={{ flexShrink: 0 }}>
            Failed to load positions{error instanceof Error ? `: ${error.message}` : ''}
          </Alert>
        )}

        {/* P&L chart */}
        <Paper variant="outlined" sx={{ flexShrink: 0, overflow: 'hidden' }}>
          <Box sx={{
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled' }}>
              Unrealized P&amp;L
            </Typography>
            <Typography variant="caption" color="text.secondary">
              5-min rolling window · live
            </Typography>
          </Box>
          <PnlChart data={pnlHistory} height={140} />
        </Paper>

        {/* Table toolbar */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            flexShrink: 0,
            p: 1.5,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'var(--pd-bg-surface)',
          }}
        >
          <SearchField
            size="small"
            placeholder="Filter symbols…"
            inputProps={{ 'aria-label': 'filter symbols' }}
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            sx={{ width: 240 }}
          />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Export positions as CSV">
            <span>
              <IconButton
                size="small"
                aria-label="export positions as CSV"
                onClick={() => downloadCsv(filteredSorted)}
                disabled={filteredSorted.length === 0}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Open the trading terminal to place orders">
            <Button
              size="small"
              variant="outlined"
              component={RouterLink}
              to="/trading"
              sx={{ minWidth: 'auto', px: 1.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              Trade
            </Button>
          </Tooltip>
        </Stack>

        {/* Positions table — fills all remaining height */}
        <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
          <Table
            size="small"
            aria-label="positions table"
            sx={{
              '& .MuiTableBody-root .MuiTableCell-root': {
                height: 44,
                py: 0,
                verticalAlign: 'middle',
              },
            }}
          >
            <TableHead>
              <TableRow>
                <SortableHeader label="Symbol" sortKey="symbol" align="left" sort={sort} onSort={handleSort} />
                <SortableHeader label="Qty" sortKey="quantity" tooltip="Number of shares held" sx={{ display: { xs: 'none', sm: 'table-cell' } }} sort={sort} onSort={handleSort} />
                <SortableHeader label="Avg Cost" sortKey="averageCost" tooltip="Average price paid per share across all purchases" sx={{ display: { xs: 'none', md: 'table-cell' } }} sort={sort} onSort={handleSort} />
                <SortableHeader label="Market Price" sortKey="marketPrice" tooltip="Current live market price for this symbol" sx={{ display: { xs: 'none', md: 'table-cell' } }} sort={sort} onSort={handleSort} />
                <TableCell
                  align="right"
                  sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', py: 1, display: { xs: 'none', lg: 'table-cell' } }}
                >
                  <Tooltip title="Current total value of this position (shares × market price)" placement="top">
                    <span>Mkt Value</span>
                  </Tooltip>
                </TableCell>
                <SortableHeader label="Unrealized P&L" sortKey="unrealizedPnl" tooltip="Profit or loss if all shares were sold at the current market price" sort={sort} onSort={handleSort} />
                <SortableHeader label="% Return" sortKey="pctReturn" tooltip="Percentage gain or loss relative to your average cost" sort={sort} onSort={handleSort} />
                <TableCell
                  align="center"
                  sx={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'text.disabled',
                    py: 1,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  <Tooltip title="Price movement sparkline for the last 5 minutes" placement="top">
                    <span>Trend</span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}><Skeleton height={14} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filteredSorted.map((p, index) => {
                    const ret = pctReturn(p);
                    const history = tickHistory.get(p.symbol) ?? [];

                    const marketValue = p.quantity * p.marketPrice;
                    return (
                      <TableRow
                        key={p.symbol}
                        sx={tableRowSx(index)}
                      >
                        <TableCell sx={{ fontWeight: 700 }}>{p.symbol}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'table-cell' } }}>{p.quantity}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>{fmt(p.averageCost)}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', display: { xs: 'none', md: 'table-cell' } }}>{fmt(p.marketPrice)}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', display: { xs: 'none', lg: 'table-cell' } }}>
                          ${fmt(marketValue)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: pnlColour(p.unrealizedPnl), fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
                          aria-label={`${p.symbol} unrealized PnL`}
                        >
                          {fmtPnl(p.unrealizedPnl)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: pnlColour(ret), fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                          aria-label={`${p.symbol} return`}
                        >
                          {ret >= 0 ? '+' : ''}{fmt(ret)}%
                        </TableCell>
                        <TableCell align="center" sx={{ width: 136, px: 0.5, display: { xs: 'none', sm: 'table-cell' } }}>
                          <div style={{ width: 120, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {history.length >= 2 ? (
                              <Sparkline data={history} width={120} height={36} />
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
