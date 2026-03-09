import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { IdentityThrottleGuard } from '../../infrastructure/throttle/identity-throttle.guard';
import { ProxyService } from '../../application/proxy/proxy.service';

const MARKET_URL =
  process.env['MARKET_DATA_SERVICE_URL'] ?? 'http://localhost:3011';

@ApiTags('watchlist')
@ApiBearerAuth()
@UseGuards(IdentityThrottleGuard)
@Controller('api/v1/watchlist')
export class WatchlistController {
  constructor(private readonly proxy: ProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get latest market snapshot' })
  get(@Req() req: FastifyRequest): Promise<unknown> {
    return this.proxy.forward(req, `${MARKET_URL}/watchlist`, 'GET');
  }
}
