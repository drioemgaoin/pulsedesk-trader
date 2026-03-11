import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { IdentityThrottleGuard } from '../../infrastructure/throttle/identity-throttle.guard';
import { ProxyService } from '../../application/proxy/proxy.service';
import type { JwtPayload } from '../../infrastructure/auth/jwt.strategy';

const ORDER_URL = process.env['ORDER_SERVICE_URL'] ?? 'http://localhost:3012';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(IdentityThrottleGuard)
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly proxy: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List orders by account ID' })
  list(
    @Req() req: FastifyRequest,
    @Query('accountId') accountId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<unknown> {
    // Enforce that the requested accountId matches the authenticated subject —
    // prevents IDOR: a valid JWT holder querying another account's orders.
    const jwtUser = (req as FastifyRequest & { user?: JwtPayload }).user;
    if (!jwtUser || jwtUser.sub !== accountId) {
      throw new ForbiddenException('accountId does not match authenticated identity');
    }
    const params = new URLSearchParams({ accountId });
    if (status) params.set('status', status);
    if (limit) params.set('limit', limit);
    if (offset) params.set('offset', offset);
    return this.proxy.forward(req, `${ORDER_URL}/v1/orders?${params.toString()}`, 'GET');
  }

  @Post()
  @ApiOperation({ summary: 'Submit order command' })
  submit(
    @Req() req: FastifyRequest,
    @Body() body: unknown,
  ): Promise<unknown> {
    return this.proxy.forward(req, `${ORDER_URL}/v1/orders`, 'POST', body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order status' })
  async get(@Req() req: FastifyRequest, @Param('id') id: string): Promise<unknown> {
    const jwtUser = (req as FastifyRequest & { user?: JwtPayload }).user;
    if (!jwtUser?.sub) throw new UnauthorizedException('Missing identity');
    const order = await this.proxy.forward<{ accountId: string }>(req, `${ORDER_URL}/v1/orders/${id}`, 'GET');
    if (order.accountId !== jwtUser.sub) {
      throw new ForbiddenException('Order does not belong to authenticated identity');
    }
    return order;
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel working order' })
  async cancel(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    const jwtUser = (req as FastifyRequest & { user?: JwtPayload }).user;
    if (!jwtUser?.sub) throw new UnauthorizedException('Missing identity');
    const order = await this.proxy.forward<{ accountId: string }>(req, `${ORDER_URL}/v1/orders/${id}`, 'GET');
    if (order.accountId !== jwtUser.sub) {
      throw new ForbiddenException('Order does not belong to authenticated identity');
    }
    return this.proxy.forward(req, `${ORDER_URL}/v1/orders/${id}/cancel`, 'POST');
  }
}
