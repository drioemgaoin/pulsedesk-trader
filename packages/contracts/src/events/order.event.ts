// Kafka event contracts — Order domain

import type { OrderSide, OrderStatus, OrderType } from '../api/v1/order.dto';

export interface OrderSubmittedEvent {
  eventType: 'order.submitted';
  schemaVersion: 1;
  orderId: string;
  idempotencyKey: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  timestamp: string;
}

export interface OrderStatusChangedEvent {
  eventType: 'order.statusChanged';
  schemaVersion: 1;
  orderId: string;
  accountId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  reason?: string;
  timestamp: string;
}
