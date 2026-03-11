import { useMarketStream } from './useMarketStream';

const STREAM_URL =
  (import.meta.env['VITE_STREAM_URL'] as string | undefined) ?? 'ws://localhost:3016/stream';

export function WatchlistPanel() {
  const snapshot = useMarketStream(STREAM_URL);
  const ticks = Object.values(snapshot).sort((a, b) => a.symbol.localeCompare(b.symbol));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-zinc-800 border-b border-zinc-700 px-3 py-2">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Watchlist</h2>
      </div>
      <div className="flex-1 overflow-auto">
        {ticks.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-500">Connecting to market stream…</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-zinc-900">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-zinc-500 font-medium">Symbol</th>
                <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Bid</th>
                <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Ask</th>
                <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Last</th>
                <th scope="col" className="px-3 py-2 text-right text-zinc-500 font-medium">Volume</th>
              </tr>
            </thead>
            <tbody>
              {ticks.map((tick) => (
                <tr key={tick.symbol} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-3 py-1.5 font-medium text-zinc-200">{tick.symbol}</td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">{tick.bid.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">{tick.ask.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right text-zinc-300">{tick.last.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right text-zinc-400">{tick.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
