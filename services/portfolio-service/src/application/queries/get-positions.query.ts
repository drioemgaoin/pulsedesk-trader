import { Inject, Injectable } from '@nestjs/common';
import { PositionsResponseV1, PositionV1 } from '@pulsedesk/contracts';
import { IPositionRepository, POSITION_REPOSITORY } from '../../domain/ports/position-repository.port';
import { IMarketPriceCache, MARKET_PRICE_CACHE } from '../../domain/ports/market-price-cache.port';

@Injectable()
export class GetPositionsQuery {
  constructor(
    @Inject(POSITION_REPOSITORY) private readonly repo: IPositionRepository,
    @Inject(MARKET_PRICE_CACHE) private readonly priceCache: IMarketPriceCache,
  ) {}

  async execute(accountId: string): Promise<PositionsResponseV1> {
    const positions = await this.repo.findAllByAccount(accountId);

    const positionDtos: PositionV1[] = positions.map((position) => {
      const marketPrice = this.priceCache.getPrice(position.symbol) ?? position.averageCost;
      const unrealizedPnl = position.unrealizedPnl(marketPrice);

      return {
        accountId: position.accountId,
        symbol: position.symbol,
        quantity: position.quantity,
        averageCost: position.averageCost,
        marketPrice,
        unrealizedPnl,
        updatedAt: position.updatedAt,
      };
    });

    const totalUnrealizedPnl = positionDtos.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    return {
      accountId,
      positions: positionDtos,
      totalUnrealizedPnl,
      asOf: new Date().toISOString(),
    };
  }
}
