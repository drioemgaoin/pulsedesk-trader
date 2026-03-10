import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Order } from '../../domain/order.entity';
import { IOrderRepository, ORDER_REPOSITORY } from '../../domain/ports/order-repository.port';
import { SubmitOrderCommand } from '../commands/submit-order.command';

export interface SubmitOrderResult {
  order: Order;
  created: boolean;
}

@Injectable()
export class SubmitOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
  ) {}

  async execute(cmd: SubmitOrderCommand): Promise<SubmitOrderResult> {
    const existing = await this.repo.findByCommandId(cmd.commandId);
    if (existing) {
      return { order: existing, created: false };
    }

    const order = Order.create({
      id: randomUUID(),
      commandId: cmd.commandId,
      symbol: cmd.symbol,
      side: cmd.side,
      type: cmd.type,
      quantity: cmd.quantity,
      limitPrice: cmd.limitPrice,
    });

    const saved = await this.repo.save(order);
    return { order: saved, created: true };
  }
}
