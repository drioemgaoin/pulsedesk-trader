export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FILLED'
  | 'PARTIALLY_FILLED'
  | 'CANCELLED';

export interface OrderResponseV1 {
  id: string;
  commandId: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PositionV1 {
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  marketPrice: number;
  unrealizedPnl: number;
  updatedAt: string;
}

export interface PositionsResponseV1 {
  accountId: string;
  positions: PositionV1[];
  totalUnrealizedPnl: number;
  asOf: string;
}

// Internal frontend request type — idempotencyKey is mapped to commandId by useSubmitOrderMutation
export interface SubmitOrderRequestV1 {
  idempotencyKey: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
}

export interface OrdersPageV1 {
  orders: OrderResponseV1[];
  pagination: { limit: number; offset: number; total: number };
}

export interface MarketQuoteV1 {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
}

export interface WatchlistResponseV1 {
  quotes: MarketQuoteV1[];
  asOf: string;
}
