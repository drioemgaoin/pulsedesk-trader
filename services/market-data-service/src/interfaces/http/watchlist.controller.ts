import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { WatchlistResponseV1 } from '@pulsedesk/contracts';
import { GetWatchlistUseCase } from '../../application/get-watchlist.use-case';

/**
 * Security: no per-request auth guard — this service is internal-only
 * (no host-port binding in Docker Compose). The API Gateway enforces JWT
 * before proxying to this endpoint. Network isolation is the trust boundary.
 */
@ApiTags('market-data')
@Controller()
export class WatchlistController {
  constructor(private readonly getWatchlist: GetWatchlistUseCase) {}

  @Get('watchlist')
  @ApiOperation({ summary: 'Latest market snapshot per configured symbol' })
  @ApiQuery({ name: 'symbols', required: false, description: 'Comma-separated symbols to filter (max 50)' })
  get(@Query('symbols') symbolsParam?: string): WatchlistResponseV1 {
    const symbols = symbolsParam
      ? symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : undefined;
    return this.getWatchlist.execute(symbols);
  }
}
