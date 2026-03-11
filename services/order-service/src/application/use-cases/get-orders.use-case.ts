import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../../domain/order.entity';
import { IOrderRepository, ORDER_REPOSITORY } from '../../domain/ports/order-repository.port';

@Injectable()
export class GetOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
  ) {}

  async execute(accountId: string): Promise<Order[]> {
    return this.repo.findAllByAccount(accountId);
  }
}
