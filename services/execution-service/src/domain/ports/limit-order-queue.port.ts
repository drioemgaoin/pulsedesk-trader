import { OrderSide } from '../enums/order-side.enum';

export const LIMIT_ORDER_QUEUE = Symbol('ILimitOrderQueue');

export interface PendingLimitOrder {
  orderId: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  limitPrice: number;
}

export interface ILimitOrderQueue {
  add(order: PendingLimitOrder): void;
  remove(orderId: string): void;
  getBySymbol(symbol: string): PendingLimitOrder[];
}
