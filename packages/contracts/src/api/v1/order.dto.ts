// API v1 — Order DTOs

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FILLED'
  | 'PARTIALLY_FILLED'
  | 'CANCELLED';

export interface SubmitOrderRequestV1 {
  /** Client-supplied idempotency key (UUID) */
  idempotencyKey: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  /** Required for LIMIT orders */
  limitPrice?: number;
}

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

export interface CancelOrderResponseV1 {
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
}
