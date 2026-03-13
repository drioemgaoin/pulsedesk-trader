import type { PositionV1 } from '../api/types';
import { pctReturn } from './portfolioCalc';

export function buildCsvContent(positions: PositionV1[]): string {
  const header = 'Symbol,Quantity,Avg Cost,Market Price,Unrealized PnL,% Return';
  const rows = positions.map((p) =>
    [
      p.symbol,
      p.quantity,
      p.averageCost.toFixed(2),
      p.marketPrice.toFixed(2),
      p.unrealizedPnl.toFixed(2),
      pctReturn(p).toFixed(2),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function downloadCsv(positions: PositionV1[]): void {
  const csv = buildCsvContent(positions);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'positions.csv';
  a.click();
  URL.revokeObjectURL(url);
}
