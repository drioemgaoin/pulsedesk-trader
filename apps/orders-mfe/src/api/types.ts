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
  rejectionReason?: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersPageV1 {
  orders: OrderResponseV1[];
  pagination: { limit: number; offset: number; total: number };
}
