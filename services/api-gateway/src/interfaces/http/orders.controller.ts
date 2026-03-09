import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { IdentityThrottleGuard } from '../../infrastructure/throttle/identity-throttle.guard';
import { ProxyService } from '../../application/proxy/proxy.service';

const ORDER_URL = process.env['ORDER_SERVICE_URL'] ?? 'http://localhost:3012';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(IdentityThrottleGuard)
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly proxy: ProxyService) {}

  @Post()
  @ApiOperation({ summary: 'Submit order command' })
  submit(
    @Req() req: FastifyRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    return this.proxy.forward(req, `${ORDER_URL}/orders`, 'POST', body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order status' })
  get(@Req() req: FastifyRequest, @Param('id') id: string): Promise<unknown> {
    return this.proxy.forward(req, `${ORDER_URL}/orders/${id}`, 'GET');
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel working order' })
  cancel(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.proxy.forward(req, `${ORDER_URL}/orders/${id}/cancel`, 'POST');
  }
}
