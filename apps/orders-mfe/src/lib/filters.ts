import type { OrderSide, OrderStatus } from '../api/types';
export type { OrderStatus };

export const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'FILLED',
  'REJECTED',
  'CANCELLED',
];

export const KNOWN_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN'];

export interface OrderFilters {
  statuses: OrderStatus[];
  symbols: string[];
  side: OrderSide | 'ALL';
  dateFrom: string; // ISO date string YYYY-MM-DD or ''
  dateTo: string;
}

export const DEFAULT_FILTERS: OrderFilters = {
  statuses: [],
  symbols: [],
  side: 'ALL',
  dateFrom: '',
  dateTo: '',
};

export function buildQueryString(
  accountId: string,
  page: number,
  filters: OrderFilters,
  pageSize = 25,
): string {
  const params = new URLSearchParams();
  if (accountId) params.set('accountId', accountId);
  params.set('limit', String(pageSize));
  params.set('offset', String(page * pageSize));
  if (filters.statuses.length > 0) params.set('status', filters.statuses.join(','));
  if (filters.symbols.length > 0)  params.set('symbol',  filters.symbols.join(','));
  if (filters.side !== 'ALL') params.set('side', filters.side);
  if (filters.dateFrom) params.set('from', filters.dateFrom);
  if (filters.dateTo) params.set('to', filters.dateTo);
  return `?${params.toString()}`;
}

/**
 * Client-side filter applied on top of the API response.
 * The backend does not implement all filter params, so we post-filter locally.
 */
export function applyClientFilters<T extends {
  side: OrderSide;
  symbol: string;
  status: OrderStatus;
  createdAt: string;
}>(orders: T[], filters: OrderFilters): T[] {
  return orders.filter((o) => {
    if (filters.side !== 'ALL' && o.side !== filters.side) return false;
    if (filters.symbols.length > 0 && !filters.symbols.includes(o.symbol)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(o.status)) return false;
    if (filters.dateFrom && o.createdAt < filters.dateFrom) return false;
    if (filters.dateTo && o.createdAt > filters.dateTo + 'T23:59:59') return false;
    return true;
  });
}

export function hasActiveFilters(filters: OrderFilters): boolean {
  return (
    filters.statuses.length > 0 ||
    filters.symbols.length > 0 ||
    filters.side !== 'ALL' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== ''
  );
}
