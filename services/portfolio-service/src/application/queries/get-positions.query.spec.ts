import { GetPositionsQuery } from './get-positions.query';
import { Position } from '../../domain/position.entity';
import { IPositionRepository } from '../../domain/ports/position-repository.port';
import { IMarketPriceCache } from '../../domain/ports/market-price-cache.port';

const makeRepo = (positions: Position[]): jest.Mocked<IPositionRepository> => ({
  findByAccountAndSymbol: jest.fn(),
  findAllByAccount: jest.fn().mockResolvedValue(positions),
  savePositionWithFill: jest.fn(),
});

const makeCache = (price: number | null = null): jest.Mocked<IMarketPriceCache> => ({
  getPrice: jest.fn().mockReturnValue(price),
  setPrice: jest.fn(),
});

describe('Given positions exist and market prices are cached', () => {
  describe('when execute is called', () => {
    it('should return PositionsResponseV1 with correct unrealizedPnl', async () => {
      const positions = [
        new Position({ id: 'pos-1', accountId: 'acc-001', symbol: 'AAPL', quantity: 10, averageCost: 100, updatedAt: '2026-03-10T00:00:00.000Z' }),
      ];
      const repo = makeRepo(positions);
      const cache = makeCache(110);
      const query = new GetPositionsQuery(repo, cache);
      const result = await query.execute('acc-001');
      expect(result.accountId).toBe('acc-001');
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].unrealizedPnl).toBe(100);
      expect(result.positions[0].marketPrice).toBe(110);
      expect(result.totalUnrealizedPnl).toBe(100);
    });
  });
});

describe('Given positions exist but no market price cached', () => {
  describe('when execute is called', () => {
    it('should use averageCost as fallback (unrealizedPnl = 0)', async () => {
      const positions = [
        new Position({ id: 'pos-1', accountId: 'acc-001', symbol: 'AAPL', quantity: 10, averageCost: 100, updatedAt: '2026-03-10T00:00:00.000Z' }),
      ];
      const repo = makeRepo(positions);
      const cache = makeCache(null);
      const query = new GetPositionsQuery(repo, cache);
      const result = await query.execute('acc-001');
      expect(result.positions[0].unrealizedPnl).toBe(0);
      expect(result.positions[0].marketPrice).toBe(100);
      expect(result.totalUnrealizedPnl).toBe(0);
    });
  });
});

describe('Given no positions exist', () => {
  describe('when execute is called', () => {
    it('should return empty positions array with totalUnrealizedPnl = 0', async () => {
      const repo = makeRepo([]);
      const cache = makeCache(null);
      const query = new GetPositionsQuery(repo, cache);
      const result = await query.execute('acc-001');
      expect(result.positions).toHaveLength(0);
      expect(result.totalUnrealizedPnl).toBe(0);
    });
  });
});
