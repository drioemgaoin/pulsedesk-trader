import { Order } from '../order.entity';

export const ORDER_REPOSITORY = Symbol('IOrderRepository');

export interface OrdersPage {
  orders: Order[];
  total: number;
}

export interface FindOrdersQuery {
  statuses?: string[];
  limit?: number;
  offset?: number;
}

export interface IOrderRepository {
  save(order: Order): Promise<Order>;
  findByCommandId(commandId: string): Promise<Order | null>;
  findById(id: string): Promise<Order | null>;
  findAllByAccount(accountId: string, query?: FindOrdersQuery): Promise<OrdersPage>;
}
