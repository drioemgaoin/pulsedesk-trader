import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../../../domain/order.entity';

export class OrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() commandId!: string;
  @ApiProperty() accountId!: string;
  @ApiProperty() symbol!: string;
  @ApiProperty() side!: string;
  @ApiProperty() type!: string;
  @ApiProperty() quantity!: number;
  @ApiPropertyOptional() limitPrice!: number | null;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() rejectionReason!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static fromDomain(order: Order): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.commandId = order.commandId;
    dto.accountId = order.accountId;
    dto.symbol = order.symbol;
    dto.side = order.side;
    dto.type = order.type;
    dto.quantity = order.quantity;
    dto.limitPrice = order.limitPrice;
    dto.status = order.status;
    dto.rejectionReason = order.rejectionReason;
    dto.createdAt = order.createdAt.toISOString();
    dto.updatedAt = order.updatedAt.toISOString();
    return dto;
  }
}
