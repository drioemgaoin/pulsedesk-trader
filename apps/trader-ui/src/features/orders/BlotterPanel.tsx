import { usePolling } from '../../hooks/usePolling';
import type { ApiClient, OrderResponseV1, OrderStatus } from '../../api/client';

interface BlotterPanelProps {
  client: ApiClient;
  accountId: string;
}

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
          <div className="h-3 bg-zinc-700 rounded animate-pulse motion-reduce:animate-none" style={{ width: `${40 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function BlotterPanel({ client, accountId }: BlotterPanelProps) {
  const { data: orders, status, lastUpdated } = usePolling(
    () => client.getOrders(accountId),
    5000,
  );

  const isStale = status === 'stale';

  return (
    <div className="flex flex-col h-full">
      <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Orders</span>
        {isStale && (
          <span className="text-xs text-yellow-400">⚠ stale</span>
        )}
        {lastUpdated && !isStale && status === 'live' && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-auto" />
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {status === 'error' && (
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
            {status === 'loading' && orders === null && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
            {orders !== null && orders.length === 0 && status !== 'loading' && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-xs text-zinc-500 text-center">
                  No orders yet.
                </td>
              </tr>
            )}
            {orders !== null &&
              orders.map((order: OrderResponseV1) => (
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
      </div>
    </div>
  );
}
