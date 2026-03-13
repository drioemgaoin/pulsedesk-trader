import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useOrdersQuery, PAGE_SIZE } from './hooks/useOrdersQuery';
import { useCancelOrderMutation } from './hooks/useCancelOrderMutation';
import { FilterPanel } from './components/FilterPanel';
import { DEFAULT_FILTERS, hasActiveFilters } from './lib/filters';
import { downloadOrdersCsv } from './lib/csvExport';
import type { OrderFilters } from './lib/filters';
import type { OrderResponseV1, OrderStatus } from './api/types';

// ── Status chip colours ───────────────────────────────────────────────────────
const STATUS_COLOURS: Record<OrderStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  FILLED: 'success',
  PARTIALLY_FILLED: 'info',
  REJECTED: 'error',
  CANCELLED: 'default',
};

// ── Column helper ─────────────────────────────────────────────────────────────
const col = createColumnHelper<OrderResponseV1>();

const columns = [
  col.display({
    id: 'expand',
    header: '',
    cell: ({ row }) => (
      <IconButton
        size="small"
        onClick={row.getToggleExpandedHandler()}
        aria-label={row.getIsExpanded() ? 'collapse row' : 'expand row'}
      >
        {row.getIsExpanded() ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
      </IconButton>
    ),
  }),
  col.accessor('id', {
    header: 'Order ID',
    cell: ({ getValue }) => {
      const id = getValue();
      const short = id.slice(0, 8) + '…';
      return (
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Tooltip title={id}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {short}
            </Typography>
          </Tooltip>
          <Tooltip title="Copy">
            <IconButton
              size="small"
              aria-label={`copy order id ${id}`}
              onClick={() => void navigator.clipboard.writeText(id)}
            >
              <ContentCopyIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    },
  }),
  col.accessor('symbol', { header: 'Symbol' }),
  col.accessor('side', { header: 'Side' }),
  col.accessor('type', { header: 'Type' }),
  col.accessor('quantity', { header: 'Qty', meta: { align: 'right' } }),
  col.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue();
      return <Chip label={s} size="small" color={STATUS_COLOURS[s] ?? 'default'} />;
    },
  }),
  col.accessor('createdAt', {
    header: 'Submitted',
    cell: ({ getValue }) => format(new Date(getValue()), 'dd MMM yyyy HH:mm'),
  }),
  col.display({
    id: 'fillTime',
    header: 'Fill Time',
    cell: ({ row }) => {
      if (row.original.status !== 'FILLED' && row.original.status !== 'PARTIALLY_FILLED') return '—';
      return format(new Date(row.original.updatedAt), 'dd MMM yyyy HH:mm');
    },
  }),
  col.display({
    id: 'cancel',
    header: '',
    cell: ({ row }) => {
      const { status, id, symbol, quantity } = row.original;
      if (status !== 'PENDING' && status !== 'ACCEPTED') return null;
      return <CancelButton orderId={id} symbol={symbol} quantity={quantity} />;
    },
  }),
];

// ── Cancel button with confirmation dialog ────────────────────────────────────
function CancelButton({ orderId, symbol, quantity }: { orderId: string; symbol: string; quantity: number }) {
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const mutation = useCancelOrderMutation();

  function handleConfirm() {
    setOpen(false);
    mutation.mutate(orderId, {
      onError: (err) => setErrorMsg(err.message || 'Failed to cancel order'),
    });
  }

  return (
    <>
      <Tooltip title="Cancel order">
        <IconButton
          size="small"
          aria-label={`cancel order ${orderId}`}
          onClick={() => setOpen(true)}
        >
          <CancelIcon fontSize="small" color="error" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs">
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          Cancel order for {symbol} × {quantity}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Keep</Button>
          <Button color="error" variant="contained" onClick={handleConfirm}>
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
        onClose={() => setErrorMsg('')}
        message={errorMsg}
      />
    </>
  );
}

// ── Expandable row detail ─────────────────────────────────────────────────────
function RowDetail({ order }: { order: OrderResponseV1 }) {
  return (
    <Box sx={{ px: 4, py: 1, bgcolor: 'background.default' }}>
      <Stack direction="row" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="caption" color="text.secondary">Order ID</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{order.id}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Command ID</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{order.commandId}</Typography>
        </Box>
        {order.limitPrice != null && (
          <Box>
            <Typography variant="caption" color="text.secondary">Limit Price</Typography>
            <Typography variant="body2">${order.limitPrice.toFixed(2)}</Typography>
          </Box>
        )}
        {order.rejectionReason && (
          <Box>
            <Typography variant="caption" color="text.secondary">Rejection Reason</Typography>
            <Typography variant="body2" color="error.main">{order.rejectionReason}</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const theme = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));

  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError, error } = useOrdersQuery(page, filters);

  const orders = data?.orders ?? [];
  const total = data?.pagination.total ?? 0;

  const table = useReactTable({
    data: orders,
    columns,
    getRowId: (row) => row.id,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / PAGE_SIZE),
  });

  function handleFiltersChange(next: OrderFilters) {
    setFilters(next);
    setPage(0); // reset to page 1 on filter change
  }

  const filterPanel = (
    <FilterPanel filters={filters} onChange={handleFiltersChange} />
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Inline sidebar on lg+ */}
      {isLarge && (
        <Box
          sx={{
            width: 240,
            borderRight: 1,
            borderColor: 'divider',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {filterPanel}
        </Box>
      )}

      {/* Drawer on smaller screens */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        {filterPanel}
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h5" component="h1" tabIndex={-1} sx={{ flex: 1 }}>
            Orders
          </Typography>

          {/* Filter toggle on smaller screens */}
          {!isLarge && (
            <Tooltip title="Filters">
              <IconButton aria-label="open filters" onClick={() => setDrawerOpen(true)}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Export CSV">
            <span>
              <IconButton
                aria-label="export orders as CSV"
                onClick={() => downloadOrdersCsv(orders)}
                disabled={orders.length === 0}
              >
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* Error */}
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load orders{error instanceof Error ? `: ${error.message}` : ''}
          </Alert>
        )}

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small" aria-label="orders table" stickyHeader>
            <TableHead>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableCell key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : orders.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary" gutterBottom>
                          No orders match the current filters.
                        </Typography>
                        {hasActiveFilters(filters) && (
                          <Button
                            size="small"
                            onClick={() => handleFiltersChange(DEFAULT_FILTERS)}
                            aria-label="clear filters"
                          >
                            Clear filters
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                : table.getRowModel().rows.flatMap((row) => [
                    <TableRow key={row.id} hover>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>,
                    row.getIsExpanded() ? (
                      <TableRow key={`${row.id}-detail`}>
                        <TableCell colSpan={columns.length} sx={{ p: 0 }}>
                          <Collapse in>
                            <RowDetail order={row.original} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ])}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
          onPageChange={(_, p) => setPage(p)}
          aria-label="orders pagination"
        />
      </Box>
    </Box>
  );
}
