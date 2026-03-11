import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
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
  ): Promise<unknown> {
    // Enforce that the requested accountId matches the authenticated subject —
    // prevents IDOR: a valid JWT holder querying another account's orders.
    const jwtUser = (req as FastifyRequest & { user?: JwtPayload }).user;
    if (!jwtUser || jwtUser.sub !== accountId) {
      throw new ForbiddenException('accountId does not match authenticated identity');
    }
    return this.proxy.forward(req, `${ORDER_URL}/v1/orders?accountId=${encodeURIComponent(accountId)}`, 'GET');
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
  get(@Req() req: FastifyRequest, @Param('id') id: string): Promise<unknown> {
    return this.proxy.forward(req, `${ORDER_URL}/v1/orders/${id}`, 'GET');
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel working order' })
  cancel(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.proxy.forward(req, `${ORDER_URL}/v1/orders/${id}/cancel`, 'POST');
  }
}
