import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class EvaluateRiskDto {
  @ApiProperty({ description: 'Order ID from the order service' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ description: 'Idempotency key — same commandId always returns same decision' })
  @IsUUID()
  commandId!: string;

  @ApiProperty({ example: 'AAPL' })
  @IsNotEmpty()
  symbol!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ example: 150.5, description: 'Null for MARKET orders' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  limitPrice?: number | null;
}
