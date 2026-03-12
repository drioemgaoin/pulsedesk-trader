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
  orderId: string;
  idempotencyKey: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
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

export interface WatchlistResponseV1 {
  symbols: string[];
}
