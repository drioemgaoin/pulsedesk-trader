import type { PositionV1 } from '../api/types';

export type SortKey = 'symbol' | 'quantity' | 'averageCost' | 'marketPrice' | 'unrealizedPnl' | 'pctReturn';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export interface PortfolioSummary {
  positionCount: number;
  totalMarketValue: number;
  totalUnrealizedPnl: number;
}

export function pctReturn(p: PositionV1): number {
  if (p.averageCost === 0) return 0;
  return ((p.marketPrice - p.averageCost) / p.averageCost) * 100;
}

export function computeSummary(positions: PositionV1[]): PortfolioSummary {
  return {
    positionCount: positions.length,
    totalMarketValue: positions.reduce((sum, p) => sum + p.quantity * p.marketPrice, 0),
    totalUnrealizedPnl: positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
  };
}

export function sortPositions(positions: PositionV1[], sort: SortState): PositionV1[] {
  return [...positions].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    if (sort.key === 'pctReturn') {
      aVal = pctReturn(a);
      bVal = pctReturn(b);
    } else {
      aVal = a[sort.key];
      bVal = b[sort.key];
    }

    if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}
