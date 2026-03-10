import { Test, TestingModule } from '@nestjs/testing';
import { PositionsController } from './positions.controller';
import { GetPositionsQuery } from '../../application/queries/get-positions.query';
import { PositionsResponseV1 } from '@pulsedesk/contracts';

const makeQuery = (response: PositionsResponseV1): jest.Mocked<GetPositionsQuery> =>
  ({ execute: jest.fn().mockResolvedValue(response) } as unknown as jest.Mocked<GetPositionsQuery>);

const makeResponse = (overrides: Partial<PositionsResponseV1> = {}): PositionsResponseV1 => ({
  accountId: 'acc-001',
  positions: [],
  totalUnrealizedPnl: 0,
  asOf: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

describe('Given positions exist', () => {
  describe('when GET /v1/positions/:accountId is called', () => {
    it('should return PositionsResponseV1', async () => {
      const response = makeResponse({
        positions: [{
          accountId: 'acc-001',
          symbol: 'AAPL',
          quantity: 10,
          averageCost: 100,
          marketPrice: 110,
          unrealizedPnl: 100,
          updatedAt: '2026-03-10T00:00:00.000Z',
        }],
        totalUnrealizedPnl: 100,
      });
      const query = makeQuery(response);

      const module: TestingModule = await Test.createTestingModule({
        controllers: [PositionsController],
        providers: [{ provide: GetPositionsQuery, useValue: query }],
      }).compile();

      const controller = module.get<PositionsController>(PositionsController);
      const result = await controller.getPositions_('acc-001');

      expect(result.accountId).toBe('acc-001');
      expect(result.positions).toHaveLength(1);
      expect(result.totalUnrealizedPnl).toBe(100);
      expect(query.execute).toHaveBeenCalledWith('acc-001');
    });
  });
});

describe('Given no positions', () => {
  describe('when GET /v1/positions/:accountId is called', () => {
    it('should return empty positions list', async () => {
      const response = makeResponse();
      const query = makeQuery(response);

      const module: TestingModule = await Test.createTestingModule({
        controllers: [PositionsController],
        providers: [{ provide: GetPositionsQuery, useValue: query }],
      }).compile();

      const controller = module.get<PositionsController>(PositionsController);
      const result = await controller.getPositions_('acc-001');

      expect(result.positions).toHaveLength(0);
      expect(result.totalUnrealizedPnl).toBe(0);
    });
  });
});
