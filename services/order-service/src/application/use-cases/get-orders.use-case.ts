import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../../domain/order.entity';
import {
  IOrderRepository,
  ORDER_REPOSITORY,
} from '../../domain/ports/order-repository.port';

export interface GetOrdersQuery {
  accountId: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface GetOrdersResult {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class GetOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
  ) {}

  async execute(query: GetOrdersQuery): Promise<GetOrdersResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const { orders, total } = await this.repo.findAllByAccount(query.accountId, {
      status: query.status,
      limit,
      offset,
    });
    return { orders, total, limit, offset };
  }
}
