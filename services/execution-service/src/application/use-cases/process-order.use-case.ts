import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrderSubmittedEvent } from '@pulsedesk/contracts';
import { Execution } from '../../domain/execution.entity';
import { OrderType } from '../../domain/enums/order-type.enum';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { NoMarketPriceError } from '../../domain/errors/no-market-price.error';
import { IExecutionRepository, EXECUTION_REPOSITORY } from '../../domain/ports/execution-repository.port';
import { IFillEventPublisher, FILL_EVENT_PUBLISHER } from '../../domain/ports/fill-event-publisher.port';
import { IMarketPriceCache, MARKET_PRICE_CACHE } from '../../domain/ports/market-price-cache.port';

@Injectable()
export class ProcessOrderUseCase {
  private readonly logger = new Logger(ProcessOrderUseCase.name);

  constructor(
    @Inject(EXECUTION_REPOSITORY) private readonly repo: IExecutionRepository,
    @Inject(FILL_EVENT_PUBLISHER) private readonly publisher: IFillEventPublisher,
    @Inject(MARKET_PRICE_CACHE) private readonly priceCache: IMarketPriceCache,
  ) {}

  async execute(event: OrderSubmittedEvent): Promise<{ execution: Execution; created: boolean }> {
    const existing = await this.repo.findByIdempotencyKey(event.orderId);
    if (existing) {
      this.logger.log({ idempotencyKey: event.orderId }, 'duplicate order event skipped');
      return { execution: existing, created: false };
    }

    const fillPrice = this.deriveFillPrice(event);

    const start = Date.now();
    const execution = Execution.create({
      id: randomUUID(),
      idempotencyKey: event.orderId,
      orderId: event.orderId,
      accountId: event.accountId,
      symbol: event.symbol,
      side: event.side as OrderSide,
      filledQuantity: event.quantity,
      fillPrice,
      filledAt: new Date().toISOString(),
    });

    const saved = await this.repo.save(execution);

    try {
      await this.publisher.publishFill(saved);
    } catch (err) {
      this.logger.error(
        { executionId: saved.id, orderId: saved.orderId, error: (err as Error).message },
        'Failed to publish fill event — execution persisted but downstream not notified',
      );
    }

    this.logger.log({
      executionId: saved.id,
      orderId: saved.orderId,
      accountId: saved.accountId,
      symbol: saved.symbol,
      side: saved.side,
      filledQuantity: saved.filledQuantity,
      fillPrice: saved.fillPrice,
      latencyMs: Date.now() - start,
    }, 'order filled');

    return { execution: saved, created: true };
  }

  private deriveFillPrice(event: OrderSubmittedEvent): number {
    if (event.type === OrderType.LIMIT) {
      return event.limitPrice!;
    }
    const price = this.priceCache.getPrice(event.symbol);
    if (price === null) {
      throw new NoMarketPriceError(event.symbol);
    }
    return price;
  }
}
