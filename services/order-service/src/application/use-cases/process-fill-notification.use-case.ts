import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrderFilledEvent } from '@pulsedesk/contracts';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { IOrderRepository, ORDER_REPOSITORY } from '../../domain/ports/order-repository.port';
import type { Order } from '../../domain/order.entity';

/**
 * Consumes OrderFilledEvent from execution-service and updates order status to FILLED.
 *
 * Out-of-order event handling rules:
 *   ACCEPTED  → fill event → transition to FILLED and save  (normal path)
 *   FILLED    → fill event → skip (already filled — idempotency)
 *   REJECTED  → fill event → skip with warning (out-of-order, execution lag)
 *   CANCELLED → fill event → skip with warning (out-of-order, execution lag)
 *   PENDING   → fill event → skip with warning (should not happen — execution only processes ACCEPTED)
 *   not found → fill event → skip with warning (order may have been deleted or wrong topic)
 */
@Injectable()
export class ProcessFillNotificationUseCase {
  private readonly logger = new Logger(ProcessFillNotificationUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
  ) {}

  async execute(event: OrderFilledEvent): Promise<Order | null> {
    const order = await this.repo.findById(event.orderId);

    if (!order) {
      this.logger.warn(
        { orderId: event.orderId, executionId: event.executionId },
        'Order not found for fill event — skipping (poison-pill)',
      );
      return null;
    }

    if (order.status === OrderStatus.FILLED) {
      this.logger.log(
        { orderId: order.id, executionId: event.executionId },
        'Order already FILLED — skipping (idempotency)',
      );
      return order;
    }

    if (
      order.status === OrderStatus.REJECTED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.PENDING
    ) {
      this.logger.warn(
        { orderId: order.id, currentStatus: order.status, executionId: event.executionId },
        'Fill event received for order in terminal/unexpected status — skipping (out-of-order)',
      );
      return null;
    }

    // order.status === OrderStatus.ACCEPTED — normal path
    const filled = order.fill();
    const saved = await this.repo.save(filled);

    this.logger.log(
      { orderId: saved.id, executionId: event.executionId },
      'Order transitioned to FILLED',
    );

    return saved;
  }
}
