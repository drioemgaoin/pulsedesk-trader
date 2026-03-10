import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OrderFilledEvent } from '@pulsedesk/contracts';
import { Position } from '../../domain/position.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { IPositionRepository, POSITION_REPOSITORY } from '../../domain/ports/position-repository.port';

@Injectable()
export class ProcessFillUseCase {
  private readonly logger = new Logger(ProcessFillUseCase.name);

  constructor(
    @Inject(POSITION_REPOSITORY) private readonly repo: IPositionRepository,
  ) {}

  async execute(event: OrderFilledEvent): Promise<void> {
    const start = Date.now();

    const validSides = Object.values(OrderSide) as string[];
    if (!validSides.includes(event.side)) {
      throw new Error(`Invalid order side in fill event: '${event.side}' — expected one of [${validSides.join(', ')}]`);
    }
    const side = event.side as OrderSide;

    const existing = await this.repo.findByAccountAndSymbol(event.accountId, event.symbol);

    let position: Position;
    if (existing) {
      position = existing.applyFill(side, event.filledQuantity, event.fillPrice);
    } else {
      position = Position.open(
        randomUUID(),
        event.accountId,
        event.symbol,
        side,
        event.filledQuantity,
        event.fillPrice,
      );
    }

    const result = await this.repo.savePositionWithFill(position, event.executionId);

    if (result === 'DUPLICATE') {
      this.logger.log(
        { executionId: event.executionId, accountId: event.accountId, symbol: event.symbol },
        'duplicate fill event skipped',
      );
      return;
    }

    this.logger.log({
      accountId: position.accountId,
      symbol: position.symbol,
      quantity: position.quantity,
      averageCost: position.averageCost,
      latencyMs: Date.now() - start,
    }, 'position updated from fill');
  }
}
