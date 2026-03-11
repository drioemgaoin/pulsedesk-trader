import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from '../../application/use-cases/get-orders.use-case';
import { SubmitOrderUseCase } from '../../application/use-cases/submit-order.use-case';
import { OrderValidationError } from '../../domain/errors/order-validation.error';
import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { OrderResponseDto } from './dto/order-response.dto';
import { SubmitOrderDto } from './dto/submit-order.dto';

const VALID_STATUSES = new Set<string>(Object.values(OrderStatus));

@ApiTags('orders')
@UseGuards(InternalApiKeyGuard)
@Controller('v1/orders')
export class OrdersController {
  constructor(
    private readonly submitOrder: SubmitOrderUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly getOrders: GetOrdersUseCase,
  ) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List orders by account ID with optional pagination and status filter' })
  @ApiQuery({ name: 'accountId', required: true })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'limit', required: false, description: '1–200, default 50' })
  @ApiQuery({ name: 'offset', required: false, description: '>= 0, default 0' })
  async list(
    @Query('accountId') accountId: string,
    @Query('status') status?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ): Promise<{ orders: OrderResponseDto[]; pagination: { limit: number; offset: number; total: number } }> {
    if (!accountId?.trim()) {
      throw new BadRequestException('accountId query parameter is required');
    }
    const limit = limitStr !== undefined ? parseInt(limitStr, 10) : 50;
    const offset = offsetStr !== undefined ? parseInt(offsetStr, 10) : 0;
    if (isNaN(limit) || limit < 1 || limit > 200) {
      throw new BadRequestException('limit must be between 1 and 200');
    }
    if (isNaN(offset) || offset < 0) {
      throw new BadRequestException('offset must be 0 or greater');
    }
    if (status !== undefined && !VALID_STATUSES.has(status)) {
      throw new BadRequestException(`status must be one of: ${[...VALID_STATUSES].join(', ')}`);
    }
    const result = await this.getOrders.execute({ accountId, status, limit, offset });
    return {
      orders: result.orders.map((o) => OrderResponseDto.fromDomain(o)),
      pagination: { limit: result.limit, offset: result.offset, total: result.total },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Submit an order command (idempotent via commandId)' })
  async submit(@Body() dto: SubmitOrderDto): Promise<OrderResponseDto> {
    try {
      const { order, created } = await this.submitOrder.execute({
        commandId: dto.commandId,
        accountId: dto.accountId,
        symbol: dto.symbol,
        side: dto.side,
        type: dto.type,
        quantity: dto.quantity,
        limitPrice: dto.limitPrice,
      });
      // Return 201 for new orders — NestJS default for POST is 201 unless @HttpCode overrides
      if (!created) {
        // Idempotent replay: return existing order but we keep 201 to simplify (both are acceptable)
      }
      return OrderResponseDto.fromDomain(order);
    } catch (err) {
      if (err instanceof OrderValidationError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get order by ID' })
  async getById(@Param('id') id: string): Promise<OrderResponseDto> {
    try {
      const order = await this.getOrder.execute(id);
      return OrderResponseDto.fromDomain(order);
    } catch (err) {
      if (err instanceof OrderNotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }
}
