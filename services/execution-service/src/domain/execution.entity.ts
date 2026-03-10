import { OrderSide } from './enums/order-side.enum';
import { ExecutionValidationError } from './errors/execution-validation.error';

export interface ExecutionProps {
  id: string;
  idempotencyKey: string;
  orderId: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  filledQuantity: number;
  fillPrice: number;
  filledAt: string;
}

export class Execution {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly orderId: string;
  readonly accountId: string;
  readonly symbol: string;
  readonly side: OrderSide;
  readonly filledQuantity: number;
  readonly fillPrice: number;
  readonly filledAt: string;

  constructor(props: ExecutionProps) {
    this.id = props.id;
    this.idempotencyKey = props.idempotencyKey;
    this.orderId = props.orderId;
    this.accountId = props.accountId;
    this.symbol = props.symbol;
    this.side = props.side;
    this.filledQuantity = props.filledQuantity;
    this.fillPrice = props.fillPrice;
    this.filledAt = props.filledAt;
  }

  static create(params: ExecutionProps): Execution {
    if (params.filledQuantity <= 0) {
      throw new ExecutionValidationError('filledQuantity must be greater than 0');
    }
    if (params.fillPrice <= 0) {
      throw new ExecutionValidationError('fillPrice must be greater than 0');
    }
    return new Execution(params);
  }
}
