import { useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useOrdersQuery } from '../hooks/useOrdersQuery';
import { PositionsPanel } from './PositionsPanel';
import type { OrderStatus } from '../api/types';

type ActiveTab = 'ALL' | 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'POSITIONS';

function statusChipColor(status: OrderStatus): 'success' | 'primary' | 'error' | 'default' | 'warning' {
  switch (status) {
    case 'FILLED':   return 'success';
    case 'ACCEPTED': return 'primary';
    case 'REJECTED': return 'error';
    case 'PENDING':  return 'warning';
    default:         return 'default';
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return iso; }
}

interface BlotterPanelProps {
  accountId: string;
  /** When provided, a collapse toggle button appears in the tab bar */
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
}

export function BlotterPanel({ accountId, isCollapsed, onCollapseToggle }: BlotterPanelProps) {
  const [tab, setTab] = useState<ActiveTab>('ALL');

  const statusFilter: OrderStatus | undefined =
    tab === 'PENDING'   ? 'PENDING' :
    tab === 'FILLED'    ? 'FILLED' :
    tab === 'CANCELLED' ? 'CANCELLED' :
    tab === 'REJECTED'  ? 'REJECTED' :
    undefined;

  const { data: page, isLoading, isError } = useOrdersQuery(
    accountId,
    tab === 'POSITIONS' ? undefined : statusFilter,
  );

  const orders = page?.orders ?? [];
  const total  = page?.pagination.total ?? 0;

  // Badge: count PENDING + ACCEPTED in All view
  const pendingCount = tab === 'ALL'
    ? (page?.orders ?? []).filter((o) => o.status === 'PENDING' || o.status === 'ACCEPTED').length
    : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Unified tab bar — owns the bottom panel header, no outer wrapper needed ── */}
      <Box sx={{ borderBottom: isCollapsed ? 0 : 1, borderColor: 'divider', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v: ActiveTab) => setTab(v)}
          aria-label="Bottom panel tabs"
          sx={{ minHeight: 38, flex: 1 }}
          variant="scrollable"
          scrollButtons={false}
        >
          <Tab value="ALL" label="Orders" sx={{ minHeight: 38, fontSize: '0.75rem' }} />
          <Tab
            value="PENDING"
            label={
              <Badge
                badgeContent={pendingCount || undefined}
                color="warning"
                sx={{ '& .MuiBadge-badge': { right: -10, top: 2, fontSize: 10 } }}
              >
                Open
              </Badge>
            }
            sx={{ minHeight: 38, pr: pendingCount ? 3 : 1, fontSize: '0.75rem' }}
          />
          <Tab value="FILLED"    label="Filled"    sx={{ minHeight: 38, fontSize: '0.75rem' }} />
          <Tab value="REJECTED"  label="Rejected"  sx={{ minHeight: 38, fontSize: '0.75rem' }} />
          <Tab value="CANCELLED" label="Cancelled" sx={{ minHeight: 38, fontSize: '0.75rem' }} />
          <Tab value="POSITIONS" label="Positions" sx={{ minHeight: 38, fontSize: '0.75rem' }} />
        </Tabs>

        {/* Collapse toggle — owned by BlotterPanel so the outer wrapper needs no tabs */}
        {onCollapseToggle && (
          <Tooltip title={isCollapsed ? 'Expand panel' : 'Collapse panel'}>
            <IconButton
              size="small"
              onClick={onCollapseToggle}
              aria-label={isCollapsed ? 'expand bottom panel' : 'collapse bottom panel'}
              sx={{ mr: 0.5 }}
            >
              {isCollapsed
                ? <KeyboardArrowUpIcon fontSize="small" />
                : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* ── Content — hidden when collapsed ── */}
      {!isCollapsed && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>

          {/* Positions tab */}
          {tab === 'POSITIONS' && (
            <PositionsPanel accountId={accountId} />
          )}

          {/* Orders table */}
          {tab !== 'POSITIONS' && (
            <>
              {isError && orders.length === 0 && (
                <Alert severity="error" sx={{ m: 1 }}>Failed to load orders. Retrying…</Alert>
              )}

              <Table
                size="small"
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
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', py: 1, display: { xs: 'none', sm: 'table-cell' } }}>Time</TableCell>
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', py: 1 }}>Symbol</TableCell>
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', py: 1 }}>Side</TableCell>
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', py: 1, display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', py: 1, display: { xs: 'none', sm: 'table-cell' } }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', py: 1, display: { xs: 'none', md: 'table-cell' } }}>Limit</TableCell>
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.disabled', py: 1 }}>Status</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {isLoading && orders.length === 0 &&
                    [1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                          <TableCell key={j}>
                            <Skeleton height={14} width={`${40 + ((i * j * 13) % 40)}%`} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!isLoading && orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ color: 'text.disabled', py: 3 }}>
                        {tab === 'PENDING' ? 'No active orders.' : 'No orders matching filter.'}
                      </TableCell>
                    </TableRow>
                  )}

                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      hover
                      sx={{
                        ...(order.status === 'PENDING' && {
                          borderLeft: '2px solid',
                          borderLeftColor: 'warning.main',
                        }),
                      }}
                    >
                      <TableCell sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'table-cell' } }}>
                        {formatTime(order.createdAt)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{order.symbol}</TableCell>
                      <TableCell sx={{ color: order.side === 'BUY' ? 'trading.uptick' : 'trading.downtick', fontWeight: 700 }}>
                        {order.side}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>{order.type}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'table-cell' } }}>{order.quantity}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', display: { xs: 'none', md: 'table-cell' } }}>
                        {order.limitPrice != null ? order.limitPrice.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label={order.status} color={statusChipColor(order.status)} size="small" sx={{ fontSize: '0.625rem', height: 18, fontWeight: 700, letterSpacing: '0.03em' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {orders.length > 0 && total > orders.length && (
                <Stack direction="row" justifyContent="center" sx={{ p: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Showing {orders.length} of {total} — see Orders page for full history
                  </Typography>
                </Stack>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
