import type { Order } from '../order.entity';

export const ORDER_EVENT_PUBLISHER = Symbol('IOrderEventPublisher');

export interface IOrderEventPublisher {
  publishAccepted(order: Order): Promise<void>;
}
