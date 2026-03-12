import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useOrdersQuery } from '../hooks/useOrdersQuery';
import type { OrderStatus } from '../api/types';

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Filled', value: 'FILLED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Rejected', value: 'REJECTED' },
] as const;

type FilterStatus = '' | 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';

function statusChipColor(status: OrderStatus): 'success' | 'primary' | 'error' | 'default' {
  switch (status) {
    case 'FILLED': return 'success';
    case 'ACCEPTED': return 'primary';
    case 'REJECTED': return 'error';
    default: return 'default';
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface BlotterPanelProps {
  accountId: string;
}

export function BlotterPanel({ accountId }: BlotterPanelProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('');
  const { data: page, isLoading, isError, isFetching } = useOrdersQuery(
    accountId,
    filterStatus || undefined,
  );

  const orders = page?.orders ?? [];
  const total = page?.pagination.total ?? 0;

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
          Orders
        </Typography>
        {!isLoading && !isError && (
          <FiberManualRecordIcon
            color={isFetching ? 'warning' : 'success'}
            sx={{ fontSize: 8 }}
            aria-label={isFetching ? 'Refreshing' : 'Live'}
          />
        )}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filterStatus}
          onChange={(_, v: FilterStatus | null) => {
            if (v !== null) setFilterStatus(v);
          }}
          aria-label="Filter by status"
          sx={{ ml: 'auto' }}
        >
          {FILTER_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value} sx={{ px: 1.5, py: 0.25, fontSize: 11 }}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isError && orders.length === 0 && (
          <Alert severity="error" sx={{ m: 1 }}>
            Failed to load orders. Retrying…
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Symbol</TableCell>
              <TableCell>Side</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Limit Price</TableCell>
              <TableCell>Status</TableCell>
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
                  No orders matching filter.
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={order.orderId} hover>
                <TableCell sx={{ color: 'text.secondary' }}>{formatTime(order.createdAt)}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{order.symbol}</TableCell>
                <TableCell sx={{ color: order.side === 'BUY' ? 'trading.uptick' : 'trading.downtick', fontWeight: 500 }}>
                  {order.side}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{order.type}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{order.quantity}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                  {order.limitPrice != null ? order.limitPrice.toFixed(2) : '—'}
                </TableCell>
                <TableCell>
                  <Chip label={order.status} color={statusChipColor(order.status)} variant="outlined" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {orders.length > 0 && total > orders.length && (
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" color="primary" disabled>
              {total - orders.length} more — use Orders page
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
