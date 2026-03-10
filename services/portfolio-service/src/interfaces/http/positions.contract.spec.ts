/**
 * Contract spec — GET /v1/positions/:accountId (PositionsResponseV1)
 *
 * Scope: validates that every field in the HTTP response conforms to the
 * PositionsResponseV1 and PositionV1 contracts defined in @pulsedesk/contracts.
 * Also verifies PnL computation, cache-miss fallback (unrealizedPnl = 0),
 * multi-position totalUnrealizedPnl aggregation, and accountId routing.
 *
 * Style: describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PositionsController } from './positions.controller';
import { GetPositionsQuery } from '../../application/queries/get-positions.query';
import { PositionsResponseV1, PositionV1 } from '@pulsedesk/contracts';
import { IPositionRepository, POSITION_REPOSITORY } from '../../domain/ports/position-repository.port';
import { IMarketPriceCache, MARKET_PRICE_CACHE } from '../../domain/ports/market-price-cache.port';
import { Position } from '../../domain/position.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePosition = (overrides: Partial<{
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
}> = {}): Position =>
  new Position({
    id: overrides.id ?? 'pos-uuid-1',
    accountId: overrides.accountId ?? 'acc-001',
    symbol: overrides.symbol ?? 'AAPL',
    quantity: overrides.quantity ?? 10,
    averageCost: overrides.averageCost ?? 100,
    updatedAt: '2026-03-10T00:00:00.000Z',
  });

const makeRepo = (positions: Position[]): jest.Mocked<IPositionRepository> => ({
  findByAccountAndSymbol: jest.fn(),
  findAllByAccount: jest.fn().mockResolvedValue(positions),
  savePositionWithFill: jest.fn(),
});

const makeCache = (prices: Record<string, number>): jest.Mocked<IMarketPriceCache> => ({
  getPrice: jest.fn().mockImplementation((symbol: string) => prices[symbol] ?? null),
  setPrice: jest.fn(),
});

async function buildModule(
  repo: IPositionRepository,
  cache: IMarketPriceCache,
): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [PositionsController],
    providers: [
      GetPositionsQuery,
      { provide: POSITION_REPOSITORY, useValue: repo },
      { provide: MARKET_PRICE_CACHE, useValue: cache },
    ],
  }).compile();
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PositionsController — contract', () => {
  // -------------------------------------------------------------------------
  // Response envelope shape
  // -------------------------------------------------------------------------

  describe('when GET /v1/positions/:accountId returns positions with live market prices', () => {
    it('should return a PositionsResponseV1 with all required envelope fields', async () => {
      const repo = makeRepo([makePosition({ symbol: 'AAPL', quantity: 10, averageCost: 100 })]);
      const cache = makeCache({ AAPL: 110 });
      const module = await buildModule(repo, cache);
      const controller = module.get<PositionsController>(PositionsController);

      const response: PositionsResponseV1 = await controller.getPositions_('acc-001');

      expect(response).toHaveProperty('accountId');
      expect(response).toHaveProperty('positions');
      expect(response).toHaveProperty('totalUnrealizedPnl');
      expect(response).toHaveProperty('asOf');
      expect(typeof response.accountId).toBe('string');
      expect(Array.isArray(response.positions)).toBe(true);
      expect(typeof response.totalUnrealizedPnl).toBe('number');
      expect(typeof response.asOf).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // PositionV1 field contract
  // -------------------------------------------------------------------------

  describe('when a position is returned with a live market price', () => {
    it('should include all required PositionV1 fields with correct types', async () => {
      const repo = makeRepo([makePosition({ symbol: 'TSLA', quantity: 5, averageCost: 200 })]);
      const cache = makeCache({ TSLA: 220 });
      const module = await buildModule(repo, cache);
      const controller = module.get<PositionsController>(PositionsController);

      const response: PositionsResponseV1 = await controller.getPositions_('acc-001');

      expect(response.positions).toHaveLength(1);
      const position: PositionV1 = response.positions[0];
      expect(position).toHaveProperty('accountId');
      expect(position).toHaveProperty('symbol');
      expect(position).toHaveProperty('quantity');
      expect(position).toHaveProperty('averageCost');
      expect(position).toHaveProperty('marketPrice');
      expect(position).toHaveProperty('unrealizedPnl');
      expect(position).toHaveProperty('updatedAt');
      expect(typeof position.accountId).toBe('string');
      expect(typeof position.symbol).toBe('string');
      expect(typeof position.quantity).toBe('number');
      expect(typeof position.averageCost).toBe('number');
      expect(typeof position.marketPrice).toBe('number');
      expect(typeof position.unrealizedPnl).toBe('number');
      expect(typeof position.updatedAt).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // PnL computation accuracy
  // -------------------------------------------------------------------------

  describe('when a position has quantity=10, averageCost=100, and marketPrice=110', () => {
    it('should compute unrealizedPnl as (110 - 100) * 10 = 100', async () => {
      const repo = makeRepo([makePosition({ quantity: 10, averageCost: 100 })]);
      const cache = makeCache({ AAPL: 110 });
      const module = await buildModule(repo, cache);
      const controller = module.get<PositionsController>(PositionsController);

      const response = await controller.getPositions_('acc-001');

      expect(response.positions[0].unrealizedPnl).toBe(100);
      expect(response.positions[0].marketPrice).toBe(110);
    });
  });

  describe('when a position has a negative PnL because market price is below average cost', () => {
    it('should compute unrealizedPnl as a negative number', async () => {
      const repo = makeRepo([makePosition({ quantity: 10, averageCost: 150 })]);
      const cache = makeCache({ AAPL: 130 });
      const module = await buildModule(repo, cache);
      const controller = module.get<PositionsController>(PositionsController);

      const response = await controller.getPositions_('acc-001');

      expect(response.positions[0].unrealizedPnl).toBe(-200);
    });
  });

  // -------------------------------------------------------------------------
  // Cache-miss fallback (unrealizedPnl = 0)
  // -------------------------------------------------------------------------

  describe('when no market price is available in the cache for a symbol', () => {
    it('should fall back to averageCost as marketPrice so unrealizedPnl equals 0', async () => {
      const repo = makeRepo([makePosition({ symbol: 'NVDA', quantity: 10, averageCost: 400 })]);
      const cache = makeCache({}); // empty — no prices
      const module = await buildModule(repo, cache);
      const controller = module.get<PositionsController>(PositionsController);

      const response = await controller.getPositions_('acc-001');

      expect(response.positions[0].marketPrice).toBe(400);
      expect(response.positions[0].unrealizedPnl).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // totalUnrealizedPnl aggregation
  // -------------------------------------------------------------------------

  describe('when an account has multiple positions with different PnL values', () => {
    it('should aggregate totalUnrealizedPnl as the sum of all individual unrealizedPnl values', async () => {
      const positions = [
        makePosition({ id: 'pos-1', symbol: 'AAPL', quantity: 10, averageCost: 100 }), // pnl = +100
        makePosition({ id: 'pos-2', symbol: 'TSLA', quantity: 5, averageCost: 200 }),  // pnl = -50
      ];
      const repo = makeRepo(positions);
      const cache = makeCache({ AAPL: 110, TSLA: 190 });
      const module = await buildModule(repo, cache);
      const controller = module.get<PositionsController>(PositionsController);

      const response = await controller.getPositions_('acc-001');

      expect(response.positions).toHaveLength(2);
      expect(response.totalUnrealizedPnl).toBe(50); // 100 + (-50)
    });
  });

  describe('when an account has no positions', () => {
    it('should return totalUnrealizedPnl of 0 and an empty positions array', async () => {
      const module = await buildModule(makeRepo([]), makeCache({}));
      const controller = module.get<PositionsController>(PositionsController);

      const response = await controller.getPositions_('acc-empty');

      expect(response.positions).toHaveLength(0);
      expect(response.totalUnrealizedPnl).toBe(0);
      expect(response.accountId).toBe('acc-empty');
    });
  });

  // -------------------------------------------------------------------------
  // accountId routing correctness
  // -------------------------------------------------------------------------

  describe('when different accountIds are queried', () => {
    it('should pass the correct accountId to the repository and echo it in the response', async () => {
      const repo = makeRepo([]);
      const module = await buildModule(repo, makeCache({}));
      const controller = module.get<PositionsController>(PositionsController);

      const response = await controller.getPositions_('acc-XYZ');

      expect(response.accountId).toBe('acc-XYZ');
      expect(repo.findAllByAccount).toHaveBeenCalledWith('acc-XYZ');
    });
  });

  // -------------------------------------------------------------------------
  // asOf field is a valid ISO-8601 timestamp
  // -------------------------------------------------------------------------

  describe('when a positions response is returned', () => {
    it('should include an asOf field that is a valid ISO-8601 timestamp', async () => {
      const module = await buildModule(makeRepo([]), makeCache({}));
      const controller = module.get<PositionsController>(PositionsController);

      const response = await controller.getPositions_('acc-001');

      expect(Number.isNaN(Date.parse(response.asOf))).toBe(false);
    });
  });
});
