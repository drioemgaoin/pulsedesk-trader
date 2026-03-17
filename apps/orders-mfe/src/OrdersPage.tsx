import { useState, useEffect } from 'react';
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
  Badge,
  Box,
  Button,
  Collapse,
  Drawer,
  IconButton,
  Paper,
  Skeleton,
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
  DownloadIcon,
  FilterListIcon,
  FilterChip,
  StatusChip,
  tableRowSx,
} from '@pulsedesk/ui';
import { useOrdersQuery, PAGE_SIZE } from './hooks/useOrdersQuery';
import { DEFAULT_FILTERS, hasActiveFilters, ALL_STATUSES } from './lib/filters';
import { downloadOrdersCsv } from './lib/csvExport';
import { RowDetail } from './components/RowDetail';
import { SideFilter } from './components/SideFilter';
import { OrderIdCell } from './components/OrderIdCell';
import { OrderSymbolCell } from './components/OrderSymbolCell';
import { OrderSideCell } from './components/OrderSideCell';
import { OrderCancelCell } from './components/OrderCancelCell';
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
    cell: ({ getValue }) => <OrderIdCell id={getValue()} />,
  }),
  col.accessor('symbol', {
    header: 'Symbol',
    cell: ({ getValue }) => <OrderSymbolCell symbol={getValue()} />,
  }),
  col.accessor('side', {
    header: 'Side',
    cell: ({ getValue }) => <OrderSideCell side={getValue()} />,
  }),
  col.accessor('type', { header: 'Type' }),
  col.accessor('quantity', { header: 'Qty', meta: { align: 'right' } }),
  col.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <StatusChip status={getValue()} />,
  }),
  col.accessor('createdAt', {
    header: 'Submitted',
    cell: ({ getValue }) => format(new Date(getValue()), 'dd MMM yyyy HH:mm'),
  }),
  col.display({
    id: 'fillTime',
    header: 'Fill Time',
    cell: ({ row }) => {
      const { status, updatedAt } = row.original;
      if (status !== 'FILLED' && status !== 'PARTIALLY_FILLED') return '—';
      return format(new Date(updatedAt), 'dd MMM yyyy HH:mm');
    },
  }),
  col.display({
    id: 'cancel',
    header: '',
    cell: ({ row }) => {
      const { status, id, symbol, quantity } = row.original;
      return <OrderCancelCell orderId={id} symbol={symbol} quantity={quantity} status={status} />;
    },
  }),
];


function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Debounce filters so rapid status chip clicks don't fire concurrent requests
  const debouncedFilters = useDebounce(filters, 300);

  const { data, isLoading, isError, error } = useOrdersQuery(page, debouncedFilters);

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
                        color: 'text.disabled',
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
              : table.getRowModel().rows.flatMap((row, rowIndex) => [
                  <TableRow
                    key={row.id}
                    tabIndex={0}
                    onClick={() => row.toggleExpanded()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.toggleExpanded(); } }}
                    aria-expanded={row.getIsExpanded()}
                    aria-label="expand row"
                    sx={{
                      cursor: 'pointer',
                      outline: 'none',
                      ...tableRowSx(rowIndex),
                      ...((row.original.status === 'PENDING' || row.original.status === 'ACCEPTED') && {
                        borderLeft: '2px solid',
                        borderLeftColor: 'warning.main',
                      }),
                      ...(row.original.status === 'FILLED' && {
                        borderLeft: '2px solid',
                        borderLeftColor: 'success.main',
                      }),
                      ...(row.original.status === 'REJECTED' && {
                        borderLeft: '2px solid',
                        borderLeftColor: 'error.main',
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

