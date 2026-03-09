// Kafka event contracts — Execution domain

import type { OrderSide } from '../api/v1/order.dto';

export interface OrderFilledEvent {
  eventType: 'execution.filled';
  schemaVersion: 1;
  executionId: string;
  orderId: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  filledQuantity: number;
  fillPrice: number;
  timestamp: string;
}
