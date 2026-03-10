import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Order } from '../../domain/order.entity';
import { IOrderRepository, ORDER_REPOSITORY } from '../../domain/ports/order-repository.port';
import { IRiskClient, RISK_CLIENT } from '../../domain/ports/risk-client.port';
import { SubmitOrderCommand } from '../commands/submit-order.command';

export interface SubmitOrderResult {
  order: Order;
  created: boolean;
}

@Injectable()
export class SubmitOrderUseCase {
  private readonly logger = new Logger(SubmitOrderUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
    @Inject(RISK_CLIENT) private readonly riskClient: IRiskClient,
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

    const start = Date.now();
    let riskOutcome: string;
    let riskLatencyMs: number;
    let finalOrder: Order;

    try {
      const result = await this.riskClient.evaluate({
        orderId: order.id,
        commandId: order.commandId,
        symbol: order.symbol,
        quantity: order.quantity,
        limitPrice: order.limitPrice,
      });

      riskLatencyMs = Date.now() - start;
      riskOutcome = result.outcome;

      if (result.outcome === 'APPROVED') {
        finalOrder = order.accept();
      } else {
        finalOrder = order.reject(`${result.reasonCode}: ${result.reasons.join(', ')}`);
      }
    } catch {
      riskLatencyMs = Date.now() - start;
      riskOutcome = 'RISK_TIMEOUT';
      finalOrder = order.reject('RISK_TIMEOUT: risk evaluation unavailable');
    }

    const saved = await this.repo.save(finalOrder);

    this.logger.log({
      event: 'order_submitted',
      commandId: cmd.commandId,
      orderId: order.id,
      outcome: saved.status,
      riskOutcome,
      riskLatencyMs,
    });

    return { order: saved, created: true };
  }
}
