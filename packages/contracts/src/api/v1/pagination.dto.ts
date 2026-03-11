// API v1 — Pagination and query contracts

import type { OrderStatus } from './order.dto';

export interface PaginationMetaV1 {
  limit: number;
  offset: number;
  total: number;
}

export interface GetOrdersQueryV1 {
  accountId: string;
  status?: OrderStatus;
  /** 1–200, default 50 */
  limit?: number;
  /** >= 0, default 0 */
  offset?: number;
}

export interface OrdersPageV1<T = unknown> {
  orders: T[];
  pagination: PaginationMetaV1;
}

export interface GetWatchlistQueryV1 {
  /** Comma-separated list of symbols to filter (max 50) */
  symbols?: string[];
}
