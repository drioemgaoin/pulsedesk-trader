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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { GetOrdersUseCase } from '../../application/use-cases/get-orders.use-case';
import { SubmitOrderUseCase } from '../../application/use-cases/submit-order.use-case';
import { OrderValidationError } from '../../domain/errors/order-validation.error';
import { OrderNotFoundError } from '../../domain/errors/order-not-found.error';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { OrderResponseDto } from './dto/order-response.dto';
import { SubmitOrderDto } from './dto/submit-order.dto';

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
  @ApiOperation({ summary: 'List orders by account ID' })
  async list(@Query('accountId') accountId: string): Promise<OrderResponseDto[]> {
    if (!accountId || accountId.trim() === '') {
      throw new BadRequestException('accountId query parameter is required');
    }
    const orders = await this.getOrders.execute(accountId);
    return orders.map((o) => OrderResponseDto.fromDomain(o));
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
