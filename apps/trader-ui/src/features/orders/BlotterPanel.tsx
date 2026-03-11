import { useState, useEffect, useRef } from 'react';
import { usePolling } from '../../hooks/usePolling';
import type { ApiClient, OrderResponseV1, OrderStatus, OrdersPageV1 } from '../../api/client';

interface BlotterPanelProps {
  client: ApiClient;
  accountId: string;
}

type FilterStatus = '' | 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';

const FILTER_OPTIONS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Filled', value: 'FILLED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Rejected', value: 'REJECTED' },
];

function statusChipClass(status: OrderStatus): string {
  switch (status) {
    case 'FILLED':
      return 'bg-green-900/30 text-green-400';
    case 'ACCEPTED':
      return 'bg-blue-900/30 text-blue-400';
    case 'REJECTED':
      return 'bg-red-900/30 text-red-400';
    case 'PENDING':
    case 'CANCELLED':
    case 'PARTIALLY_FILLED':
    default:
      return 'bg-zinc-800 text-zinc-400';
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

function SkeletonRow() {
  return (
    <tr className="border-t border-zinc-800">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-3 py-2">
          <div
            className="h-3 bg-zinc-700 rounded animate-pulse motion-reduce:animate-none"
            style={{ width: `${40 + (i * 13) % 40}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function BlotterPanel({ client, accountId }: BlotterPanelProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('');
  const [extraOrders, setExtraOrders] = useState<OrderResponseV1[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const filterRef = useRef(filterStatus);

  // Reset extra orders when filter changes
  useEffect(() => {
    if (filterRef.current !== filterStatus) {
      filterRef.current = filterStatus;
      setExtraOrders([]);
    }
  }, [filterStatus]);

  const { data: page, status: pollStatus } = usePolling<OrdersPageV1>(
    () =>
      client.getOrders({
        accountId,
        status: filterStatus || undefined,
        limit: 50,
        offset: 0,
      }),
    5000,
  );

  const baseOrders = page?.orders ?? [];
  // Merge: extra orders are those beyond offset 50, deduped by orderId
  const baseIds = new Set(baseOrders.map((o) => o.orderId));
  const filteredExtra = extraOrders.filter((o) => !baseIds.has(o.orderId));
  const orders = [...baseOrders, ...filteredExtra];
  const total = page?.pagination.total ?? 0;
  const isStale = pollStatus === 'stale';

  const filterGroupRef = useRef<HTMLDivElement>(null);

  function handleFilterKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (idx + 1) % FILTER_OPTIONS.length;
      setFilterStatus(FILTER_OPTIONS[next].value);
      (filterGroupRef.current?.children[next] as HTMLElement | undefined)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (idx - 1 + FILTER_OPTIONS.length) % FILTER_OPTIONS.length;
      setFilterStatus(FILTER_OPTIONS[prev].value);
      (filterGroupRef.current?.children[prev] as HTMLElement | undefined)?.focus();
    }
  }

  async function handleLoadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await client.getOrders({
        accountId,
        status: filterStatus || undefined,
        limit: 50,
        offset: orders.length,
      });
      setExtraOrders((prev) => [...prev, ...next.orders]);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Orders</span>
        {isStale && <span className="text-xs text-amber-400">⚠ stale</span>}
        {!isStale && pollStatus === 'live' && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" aria-label="Live" />
        )}

        {/* Status filter — segmented radiogroup */}
        <div
          ref={filterGroupRef}
          role="radiogroup"
          aria-label="Filter by status"
          className="ml-auto flex items-center gap-0.5"
        >
          {FILTER_OPTIONS.map((opt, idx) => (
            <button
              key={opt.value}
              role="radio"
              aria-checked={filterStatus === opt.value}
              onClick={() => setFilterStatus(opt.value)}
              onKeyDown={(e) => handleFilterKeyDown(e, idx)}
              className={`px-2 py-0.5 text-xs rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                filterStatus === opt.value
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {pollStatus === 'error' && orders.length === 0 && (
          <p className="px-3 py-3 text-xs text-red-400">Failed to load orders. Retrying…</p>
        )}

        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-zinc-900">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-zinc-500 font-medium">Time</th>
              <th scope="col" className="px-3 py-2 text-left text-zinc-500 font-medium">Symbol</th>
              <th scope="col" className="px-3 py-2 text-left text-zinc-500 font-medium">Side</th>
              <th scope="col" className="px-3 py-2 text-left text-zinc-500 font-medium">Type</th>
              <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Qty</th>
              <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Limit Price</th>
              <th scope="col" className="px-3 py-2 text-left text-zinc-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pollStatus === 'loading' && orders.length === 0 && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
            {orders.length === 0 && pollStatus !== 'loading' && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-xs text-zinc-500 text-center">
                  No orders matching filter.
                </td>
              </tr>
            )}
            {orders.map((order: OrderResponseV1) => (
              <tr key={order.orderId} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                <td className="px-3 py-1.5 text-zinc-400">{formatTime(order.createdAt)}</td>
                <td className="px-3 py-1.5 font-medium text-zinc-200">{order.symbol}</td>
                <td className={`px-3 py-1.5 font-medium ${order.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                  {order.side}
                </td>
                <td className="px-3 py-1.5 text-zinc-400">{order.type}</td>
                <td className="px-3 py-1.5 text-right text-zinc-300">{order.quantity}</td>
                <td className="px-3 py-1.5 text-right text-zinc-400">
                  {order.limitPrice != null ? order.limitPrice.toFixed(2) : '—'}
                </td>
                <td className="px-3 py-1.5">
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${statusChipClass(order.status)}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Load more */}
        {orders.length > 0 && total > orders.length && (
          <div className="px-3 py-2 flex justify-end">
            <button
              onClick={() => { void handleLoadMore(); }}
              disabled={loadingMore}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded px-2 py-1"
            >
              {loadingMore ? 'Loading…' : `Load more (${total - orders.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
