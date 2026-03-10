import { EvaluateRiskUseCase } from './evaluate-risk.use-case';
import { RiskDecisionOutcome } from '../../domain/enums/risk-decision-outcome.enum';
import { RiskReasonCode } from '../../domain/enums/risk-reason-code.enum';
import { IRiskMetrics } from '../../domain/ports/risk-metrics.port';

const LIMITS = { maxQuantity: 1000, maxNotional: 100_000 };

const makeMetrics = (): IRiskMetrics => ({ recordEvaluation: jest.fn() });

const BASE_CMD = {
  orderId: 'order-1',
  commandId: 'cmd-1',
  symbol: 'AAPL',
  quantity: 10,
  limitPrice: 150,
};

describe('Given a valid order within all limits', () => {
  describe('when EvaluateRiskUseCase.execute is called', () => {
    it('should return an APPROVED decision with NONE reason code', () => {
      const result = new EvaluateRiskUseCase(makeMetrics()).execute(BASE_CMD, LIMITS);
      expect(result.outcome).toBe(RiskDecisionOutcome.APPROVED);
      expect(result.reasonCode).toBe(RiskReasonCode.NONE);
    });

    it('should record the evaluation with APPROVED outcome', () => {
      const metrics = makeMetrics();
      new EvaluateRiskUseCase(metrics).execute(BASE_CMD, LIMITS);
      expect(metrics.recordEvaluation).toHaveBeenCalledWith(RiskDecisionOutcome.APPROVED, expect.any(Number));
    });
  });
});

describe('Given an order that exceeds the quantity limit', () => {
  describe('when EvaluateRiskUseCase.execute is called', () => {
    it('should return a REJECTED decision with QUANTITY_LIMIT_EXCEEDED reason code', () => {
      // limitPrice: 1 keeps notional (1001) well below maxNotional (100_000) so only qty fails
      const result = new EvaluateRiskUseCase(makeMetrics()).execute({ ...BASE_CMD, quantity: 1001, limitPrice: 1 }, LIMITS);
      expect(result.outcome).toBe(RiskDecisionOutcome.REJECTED);
      expect(result.reasonCode).toBe(RiskReasonCode.QUANTITY_LIMIT_EXCEEDED);
    });

    it('should include a human-readable reason describing the violation', () => {
      const result = new EvaluateRiskUseCase(makeMetrics()).execute({ ...BASE_CMD, quantity: 1001, limitPrice: 1 }, LIMITS);
      expect(result.reasons[0]).toMatch(/1001/);
    });
  });
});

describe('Given an order that exceeds the notional limit', () => {
  describe('when EvaluateRiskUseCase.execute is called', () => {
    it('should return a REJECTED decision with NOTIONAL_LIMIT_EXCEEDED reason code', () => {
      // 10 * 15000 = 150000 > 100000
      const result = new EvaluateRiskUseCase(makeMetrics()).execute({ ...BASE_CMD, limitPrice: 15_000 }, LIMITS);
      expect(result.outcome).toBe(RiskDecisionOutcome.REJECTED);
      expect(result.reasonCode).toBe(RiskReasonCode.NOTIONAL_LIMIT_EXCEEDED);
    });
  });
});

describe('Given an order that exceeds both quantity and notional limits', () => {
  describe('when EvaluateRiskUseCase.execute is called', () => {
    it('should return a REJECTED decision with MULTIPLE_LIMITS_EXCEEDED reason code', () => {
      const result = new EvaluateRiskUseCase(makeMetrics()).execute({ ...BASE_CMD, quantity: 1001, limitPrice: 200 }, LIMITS);
      expect(result.outcome).toBe(RiskDecisionOutcome.REJECTED);
      expect(result.reasonCode).toBe(RiskReasonCode.MULTIPLE_LIMITS_EXCEEDED);
      expect(result.reasons).toHaveLength(2);
    });
  });
});

describe('Given a MARKET order with no limitPrice', () => {
  describe('when EvaluateRiskUseCase.execute is called', () => {
    it('should skip notional check and evaluate quantity only', () => {
      const result = new EvaluateRiskUseCase(makeMetrics()).execute({ ...BASE_CMD, limitPrice: null }, LIMITS);
      expect(result.outcome).toBe(RiskDecisionOutcome.APPROVED);
    });

    it('should reject if quantity exceeds limit even without a price', () => {
      const result = new EvaluateRiskUseCase(makeMetrics()).execute({ ...BASE_CMD, quantity: 2000, limitPrice: null }, LIMITS);
      expect(result.outcome).toBe(RiskDecisionOutcome.REJECTED);
      expect(result.reasonCode).toBe(RiskReasonCode.QUANTITY_LIMIT_EXCEEDED);
    });
  });
});

describe('Given no explicit limits are provided', () => {
  describe('when EvaluateRiskUseCase.execute is called', () => {
    it('should fall back to environment-configured limits', () => {
      process.env['RISK_MAX_QUANTITY'] = '5';
      const result = new EvaluateRiskUseCase(makeMetrics()).execute({ ...BASE_CMD, quantity: 10 });
      expect(result.outcome).toBe(RiskDecisionOutcome.REJECTED);
      delete process.env['RISK_MAX_QUANTITY'];
    });
  });
});
