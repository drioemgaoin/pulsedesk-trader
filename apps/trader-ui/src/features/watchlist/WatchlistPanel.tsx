import { useMarketStream } from './useMarketStream';

const STREAM_URL =
  (import.meta.env['VITE_STREAM_URL'] as string | undefined) ?? 'ws://localhost:3016/stream';

export function WatchlistPanel() {
  const snapshot = useMarketStream(STREAM_URL);
  const ticks = Object.values(snapshot).sort((a, b) => a.symbol.localeCompare(b.symbol));

  return (
    <div>
      <h2>Watchlist</h2>
      {ticks.length === 0 ? (
        <p>Connecting to market stream…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Bid</th>
              <th>Ask</th>
              <th>Last</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {ticks.map((tick) => (
              <tr key={tick.symbol}>
                <td>{tick.symbol}</td>
                <td>{tick.bid.toFixed(2)}</td>
                <td>{tick.ask.toFixed(2)}</td>
                <td>{tick.last.toFixed(2)}</td>
                <td>{tick.volume.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
