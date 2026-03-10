import { OrderSide } from './enums/order-side.enum';
import { OrderStatus } from './enums/order-status.enum';
import { OrderType } from './enums/order-type.enum';
import { OrderValidationError } from './errors/order-validation.error';

export interface OrderProps {
  id: string;
  commandId: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice: number | null;
  status: OrderStatus;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Order {
  readonly id: string;
  readonly commandId: string;
  readonly accountId: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly type: OrderType;
  readonly quantity: number;
  readonly limitPrice: number | null;
  readonly status: OrderStatus;
  readonly rejectionReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: OrderProps) {
    this.id = props.id;
    this.commandId = props.commandId;
    this.accountId = props.accountId;
    this.symbol = props.symbol;
    this.side = props.side;
    this.type = props.type;
    this.quantity = props.quantity;
    this.limitPrice = props.limitPrice;
    this.status = props.status;
    this.rejectionReason = props.rejectionReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(params: {
    id: string;
    commandId: string;
    accountId: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    limitPrice?: number;
  }): Order {
    if (!params.symbol || params.symbol.trim() === '') {
      throw new OrderValidationError('symbol must not be empty');
    }
    if (params.quantity <= 0) {
      throw new OrderValidationError('quantity must be greater than 0');
    }
    if (params.type === OrderType.LIMIT && (params.limitPrice == null || params.limitPrice <= 0)) {
      throw new OrderValidationError('limitPrice is required and must be positive for LIMIT orders');
    }
    if (params.type === OrderType.MARKET && params.limitPrice != null) {
      throw new OrderValidationError('limitPrice must not be set for MARKET orders');
    }

    const now = new Date();
    return new Order({
      id: params.id,
      commandId: params.commandId,
      accountId: params.accountId,
      symbol: params.symbol.trim().toUpperCase(),
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      limitPrice: params.limitPrice ?? null,
      status: OrderStatus.PENDING,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  accept(): Order {
    return new Order({ ...this.toProps(), status: OrderStatus.ACCEPTED, updatedAt: new Date() });
  }

  reject(reason: string): Order {
    return new Order({ ...this.toProps(), status: OrderStatus.REJECTED, rejectionReason: reason, updatedAt: new Date() });
  }

  /**
   * Order lifecycle transitions from execution events:
   *
   * ACCEPTED  → fill() → FILLED      (normal path)
   * FILLED    → fill event           → skip (already filled — idempotency)
   * REJECTED  → fill event           → skip with warning (out-of-order, execution lag)
   * CANCELLED → fill event           → skip with warning (out-of-order, execution lag)
   * PENDING   → fill event           → skip with warning (should not happen — execution only processes ACCEPTED)
   * not found → fill event           → skip with warning (order may have been deleted or wrong topic)
   */
  fill(): Order {
    if (this.status !== OrderStatus.ACCEPTED) {
      throw new OrderValidationError(`Cannot fill order in status ${this.status}`);
    }
    return new Order({ ...this.toProps(), status: OrderStatus.FILLED, updatedAt: new Date() });
  }

  cancel(): Order {
    if (this.status !== OrderStatus.ACCEPTED && this.status !== OrderStatus.PENDING) {
      throw new OrderValidationError(`Cannot cancel order in status ${this.status}`);
    }
    return new Order({ ...this.toProps(), status: OrderStatus.CANCELLED, updatedAt: new Date() });
  }

  private toProps(): OrderProps {
    return {
      id: this.id,
      commandId: this.commandId,
      accountId: this.accountId,
      symbol: this.symbol,
      side: this.side,
      type: this.type,
      quantity: this.quantity,
      limitPrice: this.limitPrice,
      status: this.status,
      rejectionReason: this.rejectionReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
