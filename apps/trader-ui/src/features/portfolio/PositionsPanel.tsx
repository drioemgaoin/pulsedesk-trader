import { usePolling } from '../../hooks/usePolling';
import type { ApiClient, PositionV1 } from '../../api/client';

interface PositionsPanelProps {
  client: ApiClient;
  accountId: string;
}

function pnlClass(value: number): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function formatDecimal(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SkeletonRow() {
  return (
    <tr className="border-t border-zinc-800">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-3 py-2">
          <div
            className="h-3 bg-zinc-700 rounded animate-pulse motion-reduce:animate-none"
            style={{ width: `${45 + (i * 11) % 35}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

export function PositionsPanel({ client, accountId }: PositionsPanelProps) {
  const { data: positionsData, status, lastUpdated } = usePolling(
    () => client.getPositions(accountId),
    5000,
  );

  const isStale = status === 'stale';
  const positions = positionsData?.positions ?? null;
  const totalPnl = positionsData?.totalUnrealizedPnl ?? null;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-1.5 flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Positions</span>
        {isStale && (
          <span className="text-xs text-yellow-400">⚠ stale</span>
        )}
        {lastUpdated && !isStale && status === 'live' && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-auto" />
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {status === 'error' && (
          <p className="px-3 py-3 text-xs text-red-400">Failed to load positions. Retrying…</p>
        )}

        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-zinc-900">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-zinc-500 font-medium">Symbol</th>
              <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Qty</th>
              <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Avg Cost</th>
              <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Mkt Price</th>
              <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Unrealized PnL</th>
            </tr>
          </thead>
          <tbody>
            {status === 'loading' && positions === null && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
            {positions !== null && positions.length === 0 && status !== 'loading' && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-xs text-zinc-500 text-center">
                  No positions. Filled orders will appear here.
                </td>
              </tr>
            )}
            {positions !== null &&
              positions.map((pos: PositionV1) => (
                <tr key={pos.symbol} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-3 py-1.5 font-medium text-zinc-200">{pos.symbol}</td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">{pos.quantity}</td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">{formatDecimal(pos.averageCost)}</td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">{formatDecimal(pos.marketPrice)}</td>
                  <td
                    className={`px-3 py-1.5 text-right font-medium ${pnlClass(pos.unrealizedPnl)}`}
                    aria-label={`Unrealized P&L: ${pos.unrealizedPnl >= 0 ? '+' : ''}${formatDecimal(pos.unrealizedPnl)}`}
                  >
                    {pos.unrealizedPnl >= 0 ? '+' : ''}{formatDecimal(pos.unrealizedPnl)}
                  </td>
                </tr>
              ))}
          </tbody>
          {totalPnl !== null && positions !== null && positions.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-zinc-700">
                <td colSpan={4} className="px-3 py-2 text-xs text-zinc-400 text-right font-medium">
                  Total Unrealized PnL
                </td>
                <td
                  className={`px-3 py-2 text-right text-xs font-semibold ${pnlClass(totalPnl)}`}
                  aria-label={`Total Unrealized P&L: ${totalPnl >= 0 ? '+' : ''}${formatDecimal(totalPnl)}`}
                >
                  {totalPnl >= 0 ? '+' : ''}{formatDecimal(totalPnl)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
