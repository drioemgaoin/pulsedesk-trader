import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { IdentityThrottleGuard } from '../../infrastructure/throttle/identity-throttle.guard';
import { ProxyService } from '../../application/proxy/proxy.service';

const PORTFOLIO_URL =
  process.env['PORTFOLIO_SERVICE_URL'] ?? 'http://localhost:3015';

@ApiTags('positions')
@ApiBearerAuth()
@UseGuards(IdentityThrottleGuard)
@Controller('api/v1/positions')
export class PositionsController {
  constructor(private readonly proxy: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get positions and PnL snapshot' })
  get(@Req() req: FastifyRequest): Promise<unknown> {
    return this.proxy.forward(req, `${PORTFOLIO_URL}/positions`, 'GET');
  }
}
