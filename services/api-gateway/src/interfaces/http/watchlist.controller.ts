import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import type { WatchlistResponseV1 } from '@pulsedesk/contracts';
import { IdentityThrottleGuard } from '../../infrastructure/throttle/identity-throttle.guard';
import { ProxyService } from '../../application/proxy/proxy.service';
import {
  IWatchlistCache,
  WATCHLIST_CACHE,
} from '../../application/cache/watchlist-cache.port';

const MARKET_URL =
  process.env['MARKET_DATA_SERVICE_URL'] ?? 'http://localhost:3011';

@ApiTags('watchlist')
@ApiBearerAuth()
@UseGuards(IdentityThrottleGuard)
@Controller('api/v1/watchlist')
export class WatchlistController {
  constructor(
    private readonly proxy: ProxyService,
    @Inject(WATCHLIST_CACHE) private readonly cache: IWatchlistCache,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get latest market snapshot (1 s cache)' })
  @ApiQuery({ name: 'symbols', required: false, description: 'Comma-separated symbols to filter' })
  async get(
    @Req() req: FastifyRequest,
    @Query('symbols') symbolsParam?: string,
  ): Promise<WatchlistResponseV1> {
    // Cache-aside: always fetch and cache the full snapshot.
    // Filtering by symbols happens on the cached result in-process.
    let response = await this.cache.get();
    if (!response) {
      response = await this.proxy.forward<WatchlistResponseV1>(
        req,
        `${MARKET_URL}/watchlist`,
        'GET',
      );
      await this.cache.set(response);
    }

    if (symbolsParam) {
      const symbolSet = new Set(
        symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
      );
      return { ...response, quotes: response.quotes.filter((q) => symbolSet.has(q.symbol)) };
    }
    return response;
  }
}
