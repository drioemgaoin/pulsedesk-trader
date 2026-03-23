import { Injectable } from '@nestjs/common';
import { ILimitOrderQueue, PendingLimitOrder } from '../../domain/ports/limit-order-queue.port';

@Injectable()
export class InMemoryLimitOrderQueue implements ILimitOrderQueue {
  private readonly orders = new Map<string, PendingLimitOrder>();

  add(order: PendingLimitOrder): void {
    this.orders.set(order.orderId, order);
  }

  remove(orderId: string): void {
    this.orders.delete(orderId);
  }

  getBySymbol(symbol: string): PendingLimitOrder[] {
    const result: PendingLimitOrder[] = [];
    for (const order of this.orders.values()) {
      if (order.symbol === symbol) result.push(order);
    }
    return result;
  }
}
