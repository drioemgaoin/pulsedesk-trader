import { OrderSide } from './enums/order-side.enum';
import { PositionValidationError } from './errors/position-validation.error';

export interface PositionProps {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  updatedAt: string;
}

export class Position {
  readonly id: string;
  readonly accountId: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly averageCost: number;
  readonly updatedAt: string;

  constructor(props: PositionProps) {
    this.id = props.id;
    this.accountId = props.accountId;
    this.symbol = props.symbol;
    this.quantity = props.quantity;
    this.averageCost = props.averageCost;
    this.updatedAt = props.updatedAt;
  }

  static open(
    id: string,
    accountId: string,
    symbol: string,
    side: OrderSide,
    filledQuantity: number,
    fillPrice: number,
  ): Position {
    if (filledQuantity <= 0) {
      throw new PositionValidationError('filledQuantity must be greater than 0');
    }
    if (fillPrice <= 0) {
      throw new PositionValidationError('fillPrice must be greater than 0');
    }

    const quantity = side === OrderSide.BUY ? filledQuantity : 0;
    const averageCost = side === OrderSide.BUY ? fillPrice : 0;

    return new Position({
      id,
      accountId,
      symbol,
      quantity,
      averageCost,
      updatedAt: new Date().toISOString(),
    });
  }

  applyFill(side: OrderSide, filledQuantity: number, fillPrice: number): Position {
    if (filledQuantity <= 0) {
      throw new PositionValidationError('filledQuantity must be greater than 0');
    }
    if (fillPrice <= 0) {
      throw new PositionValidationError('fillPrice must be greater than 0');
    }

    let newQty: number;
    let newAvgCost: number;

    if (side === OrderSide.BUY) {
      newQty = this.quantity + filledQuantity;
      newAvgCost = (this.quantity * this.averageCost + filledQuantity * fillPrice) / newQty;
    } else {
      newQty = Math.max(0, this.quantity - filledQuantity);
      newAvgCost = newQty === 0 ? 0 : this.averageCost;
    }

    return new Position({
      id: this.id,
      accountId: this.accountId,
      symbol: this.symbol,
      quantity: newQty,
      averageCost: newAvgCost,
      updatedAt: new Date().toISOString(),
    });
  }

  unrealizedPnl(marketPrice: number): number {
    return (marketPrice - this.averageCost) * this.quantity;
  }
}
