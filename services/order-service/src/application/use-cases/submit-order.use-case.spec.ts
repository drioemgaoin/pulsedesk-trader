import { SubmitOrderUseCase } from './submit-order.use-case';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { OrderType } from '../../domain/enums/order-type.enum';
import { IOrderRepository } from '../../domain/ports/order-repository.port';
import { IRiskClient, RiskEvaluationResult } from '../../domain/ports/risk-client.port';

const makeRepo = (existing: Order | null = null): IOrderRepository => ({
  save: jest.fn().mockImplementation((o: Order) => Promise.resolve(o)),
  findByCommandId: jest.fn().mockResolvedValue(existing),
  findById: jest.fn().mockResolvedValue(null),
});

const makeRisk = (result: RiskEvaluationResult): IRiskClient => ({
  evaluate: jest.fn().mockResolvedValue(result),
});

const APPROVED_RESULT: RiskEvaluationResult = { outcome: 'APPROVED', reasonCode: 'NONE', reasons: [] };
const REJECTED_RESULT: RiskEvaluationResult = {
  outcome: 'REJECTED',
  reasonCode: 'QUANTITY_LIMIT_EXCEEDED',
  reasons: ['Quantity 1500 exceeds limit 1000'],
};

const VALID_CMD = {
  commandId: 'cmd-uuid-1',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 5,
  limitPrice: 150,
};

describe('Given no existing order for the commandId', () => {
  describe('when SubmitOrderUseCase.execute is called and risk approves', () => {
    it('should create and persist a new ACCEPTED order', async () => {
      const repo = makeRepo();
      const risk = makeRisk(APPROVED_RESULT);
      const { order, created } = await new SubmitOrderUseCase(repo, risk).execute(VALID_CMD);
      expect(created).toBe(true);
      expect(order.status).toBe(OrderStatus.ACCEPTED);
      expect(order.commandId).toBe(VALID_CMD.commandId);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(risk.evaluate).toHaveBeenCalledTimes(1);
    });

    it('should normalise the symbol to uppercase before persisting', async () => {
      const repo = makeRepo();
      const risk = makeRisk(APPROVED_RESULT);
      const { order } = await new SubmitOrderUseCase(repo, risk).execute({ ...VALID_CMD, symbol: 'aapl' });
      expect(order.symbol).toBe('AAPL');
    });
  });

  describe('when SubmitOrderUseCase.execute is called and risk rejects', () => {
    it('should persist a REJECTED order with the rejection reason', async () => {
      const repo = makeRepo();
      const risk = makeRisk(REJECTED_RESULT);
      const { order, created } = await new SubmitOrderUseCase(repo, risk).execute(VALID_CMD);
      expect(created).toBe(true);
      expect(order.status).toBe(OrderStatus.REJECTED);
      expect(order.rejectionReason).toContain('QUANTITY_LIMIT_EXCEEDED');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('when SubmitOrderUseCase.execute is called and the risk service times out', () => {
    it('should persist a REJECTED order with RISK_TIMEOUT reason (fail-closed)', async () => {
      const repo = makeRepo();
      const risk: IRiskClient = {
        evaluate: jest.fn().mockRejectedValue(new Error('Request timed out')),
      };
      const { order, created } = await new SubmitOrderUseCase(repo, risk).execute(VALID_CMD);
      expect(created).toBe(true);
      expect(order.status).toBe(OrderStatus.REJECTED);
      expect(order.rejectionReason).toContain('RISK_TIMEOUT');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('when SubmitOrderUseCase.execute is called with an invalid quantity', () => {
    it('should propagate OrderValidationError without persisting', async () => {
      const repo = makeRepo();
      const risk = makeRisk(APPROVED_RESULT);
      await expect(new SubmitOrderUseCase(repo, risk).execute({ ...VALID_CMD, quantity: -1 }))
        .rejects.toThrow('quantity must be greater than 0');
      expect(repo.save).not.toHaveBeenCalled();
      expect(risk.evaluate).not.toHaveBeenCalled();
    });
  });
});

describe('Given an existing order with the same commandId', () => {
  describe('when SubmitOrderUseCase.execute is called with the same commandId', () => {
    it('should return the existing order without calling risk or saving a duplicate', async () => {
      const existing = Order.create({ id: 'existing-id', ...VALID_CMD });
      const repo = makeRepo(existing);
      const risk = makeRisk(APPROVED_RESULT);
      const { order, created } = await new SubmitOrderUseCase(repo, risk).execute(VALID_CMD);
      expect(created).toBe(false);
      expect(order.id).toBe('existing-id');
      expect(repo.save).not.toHaveBeenCalled();
      expect(risk.evaluate).not.toHaveBeenCalled();
    });
  });
});
