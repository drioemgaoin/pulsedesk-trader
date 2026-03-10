import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../../domain/order.entity';
import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';
import { IOrderRepository, ORDER_REPOSITORY } from '../../domain/ports/order-repository.port';

@Injectable()
export class GetOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
  ) {}

  async execute(id: string): Promise<Order> {
    const order = await this.repo.findById(id);
    if (!order) throw new OrderNotFoundError(id);
    return order;
  }
}
