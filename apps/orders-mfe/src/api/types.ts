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
  fillPrice?: number;
  filledAt?: string;
  rejectionReason?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersPageV1 {
  orders: OrderResponseV1[];
  pagination: { limit: number; offset: number; total: number };
}
