import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { OrderSide } from '../../../domain/enums/order-side.enum';
import { OrderType } from '../../../domain/enums/order-type.enum';

export class SubmitOrderDto {
  @ApiProperty({ description: 'Client-generated idempotency key (UUID v4)' })
  @IsUUID()
  commandId!: string;

  @ApiProperty({ example: 'acc-001', description: 'Account identifier for this order' })
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({ example: 'AAPL' })
  @IsNotEmpty()
  symbol!: string;

  @ApiProperty({ enum: OrderSide })
  @IsEnum(OrderSide)
  side!: OrderSide;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  type!: OrderType;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ example: 150.5, description: 'Required for LIMIT orders' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  limitPrice?: number;
}
