import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Execution } from '../../domain/execution.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { IExecutionRepository, EXECUTION_REPOSITORY } from '../../domain/ports/execution-repository.port';
import { IFillEventPublisher, FILL_EVENT_PUBLISHER } from '../../domain/ports/fill-event-publisher.port';
import { ILimitOrderQueue, LIMIT_ORDER_QUEUE, PendingLimitOrder } from '../../domain/ports/limit-order-queue.port';

@Injectable()
export class MatchLimitOrdersUseCase {
  private readonly logger = new Logger(MatchLimitOrdersUseCase.name);

  constructor(
    @Inject(LIMIT_ORDER_QUEUE) private readonly queue: ILimitOrderQueue,
    @Inject(EXECUTION_REPOSITORY) private readonly repo: IExecutionRepository,
    @Inject(FILL_EVENT_PUBLISHER) private readonly publisher: IFillEventPublisher,
  ) {}

  async execute(symbol: string, marketPrice: number): Promise<void> {
    const candidates = this.queue.getBySymbol(symbol);

    for (const order of candidates) {
      if (!this.isConditionMet(order, marketPrice)) continue;

      this.queue.remove(order.orderId);

      const execution = Execution.create({
        id: randomUUID(),
        idempotencyKey: order.orderId,
        orderId: order.orderId,
        accountId: order.accountId,
        symbol: order.symbol,
        side: order.side,
        filledQuantity: order.quantity,
        fillPrice: order.limitPrice,
        filledAt: new Date().toISOString(),
      });

      const saved = await this.repo.save(execution);

      try {
        await this.publisher.publishFill(saved);
      } catch (err) {
        this.logger.error(
          { executionId: saved.id, orderId: saved.orderId, error: (err as Error).message },
          'Failed to publish fill event for limit order — execution persisted',
        );
      }

      this.logger.log({
        executionId: saved.id,
        orderId: saved.orderId,
        symbol: saved.symbol,
        side: saved.side,
        limitPrice: order.limitPrice,
        marketPrice,
        filledQuantity: saved.filledQuantity,
      }, 'limit order filled by market tick');
    }
  }

  /**
   * BUY limit: fill when market falls to or below the limit price (you get the price you wanted or better)
   * SELL limit: fill when market rises to or above the limit price
   */
  private isConditionMet(order: PendingLimitOrder, marketPrice: number): boolean {
    if (order.side === OrderSide.BUY) return marketPrice <= order.limitPrice;
    return marketPrice >= order.limitPrice;
  }
}
