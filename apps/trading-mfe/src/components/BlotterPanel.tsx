import { useState } from 'react';
import {
  Alert,
  Badge,
  Box,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  KeyboardArrowDownIcon,
  KeyboardArrowUpIcon,
  StatusChip,
} from '@pulsedesk/ui';
import { useOrdersQuery } from '../hooks/useOrdersQuery';
import { PositionsPanel } from './PositionsPanel';
import type { OrderStatus } from '../api/types';

type MainTab = 'ORDERS' | 'POSITIONS';
type StatusFilter = 'ALL' | 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';

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
  const [mainTab, setMainTab] = useState<MainTab>('ORDERS');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const queryStatus: OrderStatus | undefined =
    statusFilter === 'FILLED'    ? 'FILLED' :
    statusFilter === 'CANCELLED' ? 'CANCELLED' :
    statusFilter === 'REJECTED'  ? 'REJECTED' :
    undefined;

  const { data: page, isLoading, isError } = useOrdersQuery(
    accountId,
    mainTab === 'POSITIONS' ? undefined : queryStatus,
  );

  const allOrders  = page?.orders ?? [];
  const total      = page?.pagination.total ?? 0;

  // "Open" = PENDING (risk not yet checked) + ACCEPTED (risk-approved, awaiting fill)
  const openOrders   = allOrders.filter((o) => o.status === 'PENDING' || o.status === 'ACCEPTED');
  const orders       = statusFilter === 'PENDING' ? openOrders : allOrders;
  const pendingCount = openOrders.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Top navigation: Orders | Positions ── */}
      <Box sx={{ borderBottom: isCollapsed ? 0 : 1, borderColor: 'divider', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Tabs
          value={mainTab}
          onChange={(_, v: MainTab) => setMainTab(v)}
          aria-label="blotter panels"
          sx={{ flex: 1, minHeight: 38, '& .MuiTab-root': { minHeight: 38, py: 0, fontSize: '0.75rem', textTransform: 'none' } }}
        >
          <Tab label="Orders" value="ORDERS" />
          <Tab label="Positions" value="POSITIONS" />
        </Tabs>

        {/* Collapse toggle */}
        {onCollapseToggle && (
          <Tooltip title={isCollapsed ? 'Expand panel' : 'Collapse panel'}>
            <IconButton
              size="small"
              onClick={onCollapseToggle}
              aria-label={isCollapsed ? 'expand bottom panel' : 'collapse bottom panel'}
              sx={{ mr: 0.5, flexShrink: 0 }}
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

          {/* Positions panel */}
          {mainTab === 'POSITIONS' && (
            <PositionsPanel accountId={accountId} />
          )}

          {/* Orders view */}
          {mainTab === 'ORDERS' && (
            <>
              {/* ── Status filter bar ── */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto', flexShrink: 0 }}>
                <ToggleButtonGroup
                  value={statusFilter}
                  exclusive
                  onChange={(_, v: StatusFilter) => { if (v) setStatusFilter(v); }}
                  aria-label="filter by status"
                  sx={{
                    display: 'flex',
                    '& .MuiToggleButton-root': {
                      border: 'none',
                      borderRadius: 0,
                      px: 2,
                      minHeight: 34,
                      fontSize: '0.7rem',
                      textTransform: 'none',
                      '&.Mui-selected': {
                        bgcolor: 'transparent',
                        borderBottom: '2px solid',
                        borderBottomColor: 'primary.main',
                        color: 'primary.main',
                      },
                      '&:hover': { bgcolor: 'action.hover' },
                    },
                  }}
                >
                  <ToggleButton value="ALL">All</ToggleButton>
                  <ToggleButton value="PENDING" sx={{ pr: pendingCount ? 3 : undefined }}>
                    <Badge
                      badgeContent={pendingCount || undefined}
                      color="warning"
                      sx={{ '& .MuiBadge-badge': { right: -10, top: 2, fontSize: 10 } }}
                    >
                      Open
                    </Badge>
                  </ToggleButton>
                  <ToggleButton value="FILLED">Filled</ToggleButton>
                  <ToggleButton value="REJECTED">Rejected</ToggleButton>
                  <ToggleButton value="CANCELLED">Cancelled</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </>
          )}

          {/* Orders table */}
          {mainTab === 'ORDERS' && (
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
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary', py: 1, display: { xs: 'none', sm: 'table-cell' } }}>Time</TableCell>
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary', py: 1 }}>Symbol</TableCell>
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary', py: 1 }}>Side</TableCell>
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary', py: 1, display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary', py: 1, display: { xs: 'none', sm: 'table-cell' } }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary', py: 1, display: { xs: 'none', md: 'table-cell' } }}>Limit</TableCell>
                    <TableCell sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary', py: 1 }}>Status</TableCell>
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
                        {statusFilter === 'PENDING' ? 'No open orders.' : 'No orders matching filter.'}
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
                        <StatusChip status={order.status} />
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
