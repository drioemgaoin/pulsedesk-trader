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
  Autocomplete,
  Badge,
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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  CancelIcon,
  ContentCopyIcon,
  DownloadIcon,
  FilterListIcon,
  FilterChip,
  StatusChip,
  tradeSideToggleSx,
} from '@pulsedesk/ui';
import { useOrdersQuery, PAGE_SIZE } from './hooks/useOrdersQuery';
import { useCancelOrderMutation } from './hooks/useCancelOrderMutation';
import { DEFAULT_FILTERS, hasActiveFilters, ALL_STATUSES, KNOWN_SYMBOLS } from './lib/filters';
import { downloadOrdersCsv } from './lib/csvExport';
import type { OrderFilters, OrderStatus } from './lib/filters';
import type { OrderResponseV1 } from './api/types';

// Count active "secondary" filters (symbols, side, dates — not status chips)
function countSecondaryFilters(f: OrderFilters): number {
  return (
    f.symbols.length +
    (f.side !== 'ALL' ? 1 : 0) +
    (f.dateFrom ? 1 : 0) +
    (f.dateTo ? 1 : 0)
  );
}

// ── Column helper ─────────────────────────────────────────────────────────────
const col = createColumnHelper<OrderResponseV1>();

const columns = [
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
              onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(id); }}
            >
              <ContentCopyIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    },
  }),
  col.accessor('symbol', {
    header: 'Symbol',
    cell: ({ getValue }) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{getValue()}</Typography>
    ),
  }),
  col.accessor('side', {
    header: 'Side',
    cell: ({ getValue }) => {
      const side = getValue();
      return (
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: side === 'BUY' ? 'trading.uptick' : 'trading.downtick' }}
        >
          {side}
        </Typography>
      );
    },
  }),
  col.accessor('type', { header: 'Type' }),
  col.accessor('quantity', { header: 'Qty', meta: { align: 'right' } }),
  col.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue();
      return <StatusChip status={s} />;
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
      return (
        <Box onClick={(e) => e.stopPropagation()}>
          <CancelButton orderId={id} symbol={symbol} quantity={quantity} />
        </Box>
      );
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
    <Box sx={{ px: 4, py: 2, bgcolor: 'var(--pd-bg-canvas)', borderLeft: '3px solid', borderLeftColor: 'divider' }}>
      <Stack direction="row" flexWrap="wrap" gap={3}>
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
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError, error } = useOrdersQuery(page, filters);

  const orders = data?.orders ?? [];
  const total = data?.pagination.total ?? 0;
  const secondaryCount = countSecondaryFilters(filters);

  // eslint-disable-next-line react-hooks/incompatible-library
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
    setPage(0);
  }

  function toggleStatus(status: OrderStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    handleFiltersChange({ ...filters, statuses: next });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: 2, gap: 2 }}>

      {/* ── Page header ── */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h5" component="h1" tabIndex={-1} sx={{ flex: 1 }}>
          Orders
        </Typography>

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

      {/* ── Filter bar ── */}
      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{
          p: 1.5,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'var(--pd-bg-surface)',
        }}
      >
        {/* Status chips — primary filter, always visible */}
        {ALL_STATUSES.map((s) => (
          <FilterChip
            key={s}
            status={s}
            isActive={filters.statuses.includes(s)}
            onClick={() => toggleStatus(s)}
          />
        ))}

        <Box sx={{ flex: 1 }} />

        {/* Clear all — only when filters are active */}
        {hasActiveFilters(filters) && (
          <Button
            size="small"
            variant="text"
            onClick={() => handleFiltersChange(DEFAULT_FILTERS)}
            aria-label="clear active filters"
            sx={{ minWidth: 'auto', px: 1 }}
          >
            Clear
          </Button>
        )}

        {/* More filters — symbols, side, dates */}
        <Tooltip title={secondaryCount > 0 ? `${secondaryCount} more filter${secondaryCount > 1 ? 's' : ''} active` : 'More filters'}>
          <IconButton
            size="small"
            aria-label="open filters"
            onClick={() => setDrawerOpen(true)}
            color={secondaryCount > 0 ? 'primary' : 'default'}
          >
            <Badge badgeContent={secondaryCount || undefined} color="primary">
              <FilterListIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      </Stack>

      {/* ── Error ── */}
      {isError && (
        <Alert severity="error">
          Failed to load orders{error instanceof Error ? `: ${error.message}` : ''}
        </Alert>
      )}

      {/* ── Table ── */}
      <TableContainer component={Paper} variant="outlined" sx={{ flex: 1, overflow: 'auto' }}>
        <Table
          size="small"
          aria-label="orders table"
          stickyHeader
          sx={{
            '& .MuiTableBody-root .MuiTableCell-root': {
              height: 44,
              py: 0,
              verticalAlign: 'middle',
            },
          }}
        >
          <TableHead>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const headerTooltips: Record<string, string> = {
                    id: 'Unique identifier assigned to this order',
                    quantity: 'Number of shares in this order',
                    fillTime: 'Time the order was fully or partially filled by the exchange',
                    createdAt: 'Time this order was submitted',
                  };
                  // Columns hidden below a breakpoint
                  const responsiveDisplay: Record<string, object> = {
                    id:        { display: { xs: 'none', md: 'table-cell' } },
                    type:      { display: { xs: 'none', sm: 'table-cell' } },
                    quantity:  { display: { xs: 'none', sm: 'table-cell' } },
                    createdAt: { display: { xs: 'none', lg: 'table-cell' } },
                    fillTime:  { display: { xs: 'none', lg: 'table-cell' } },
                  };
                  const content = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext());
                  const tip = headerTooltips[header.id];
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                        py: 1,
                        ...responsiveDisplay[header.id],
                      }}
                    >
                      {tip ? (
                        <Tooltip title={tip} placement="top">
                          <span>{content}</span>
                        </Tooltip>
                      ) : content}
                    </TableCell>
                  );
                })}
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
                  <TableRow
                    key={row.id}
                    hover
                    tabIndex={0}
                    onClick={() => row.toggleExpanded()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.toggleExpanded(); } }}
                    aria-expanded={row.getIsExpanded()}
                    aria-label="expand row"
                    sx={{
                      cursor: 'pointer',
                      outline: 'none',
                      ...(row.original.status === 'PENDING' && {
                        borderLeft: '2px solid',
                        borderLeftColor: 'warning.main',
                      }),
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const responsiveDisplay: Record<string, object> = {
                        id:        { display: { xs: 'none', md: 'table-cell' } },
                        type:      { display: { xs: 'none', sm: 'table-cell' } },
                        quantity:  { display: { xs: 'none', sm: 'table-cell' } },
                        createdAt: { display: { xs: 'none', lg: 'table-cell' } },
                        fillTime:  { display: { xs: 'none', lg: 'table-cell' } },
                      };
                      return (
                        <TableCell key={cell.id} sx={{ ...responsiveDisplay[cell.column.id] }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
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

      {/* ── Pagination ── */}
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={PAGE_SIZE}
        rowsPerPageOptions={[PAGE_SIZE]}
        onPageChange={(_, p) => setPage(p)}
        aria-label="orders pagination"
        sx={{ flexShrink: 0 }}
      />

      {/* ── Secondary filters drawer ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 300 } }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={600}>More Filters</Typography>
            {secondaryCount > 0 && (
              <Button
                size="small"
                onClick={() => handleFiltersChange({ ...filters, symbols: [], side: 'ALL', dateFrom: '', dateTo: '' })}
                aria-label="clear secondary filters"
              >
                Clear
              </Button>
            )}
          </Stack>
        </Box>

        {/* Reuse FilterPanel but hide its status section since we handle that inline */}
        <Box sx={{ p: 2 }}>
          <SideFilter filters={filters} onChange={handleFiltersChange} />
        </Box>
      </Drawer>
    </Box>
  );
}

// ── Side + Symbol + Date secondary filters (drawer content) ───────────────────
function SideFilter({ filters, onChange }: { filters: OrderFilters; onChange: (f: OrderFilters) => void }) {
  function toggleStatus(status: OrderStatus) {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Status
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {ALL_STATUSES.map((s) => (
            <FilterChip
              key={s}
              status={s}
              isActive={filters.statuses.includes(s)}
              onClick={() => toggleStatus(s)}
            />
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Side
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          fullWidth
          value={filters.side}
          onChange={(_, v) => { if (v) onChange({ ...filters, side: v }); }}
          aria-label="side filter"
        >
          <ToggleButton value="ALL">All</ToggleButton>
          <ToggleButton value="BUY"  sx={tradeSideToggleSx('BUY')}>Buy</ToggleButton>
          <ToggleButton value="SELL" sx={tradeSideToggleSx('SELL')}>Sell</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Symbol
        </Typography>
        <Autocomplete
          multiple
          size="small"
          options={KNOWN_SYMBOLS}
          value={filters.symbols}
          onChange={(_, value) => onChange({ ...filters, symbols: value })}
          renderInput={(params) => (
            <TextField {...params} placeholder="Any symbol" inputProps={{ ...params.inputProps, 'aria-label': 'symbol filter' }} />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
            ))
          }
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Date Range
        </Typography>
        <Stack spacing={1}>
          <TextField
            size="small"
            label="From"
            type="date"
            InputLabelProps={{ shrink: true }}
            inputProps={{ 'aria-label': 'date from' }}
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          />
          <TextField
            size="small"
            label="To"
            type="date"
            InputLabelProps={{ shrink: true }}
            inputProps={{ 'aria-label': 'date to' }}
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
