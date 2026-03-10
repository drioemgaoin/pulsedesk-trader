import { Test } from '@nestjs/testing';
import { RiskController } from './risk.controller';
import { EvaluateRiskUseCase } from '../../application/use-cases/evaluate-risk.use-case';
import { RiskDecision } from '../../domain/risk-decision';
import { RiskDecisionOutcome } from '../../domain/enums/risk-decision-outcome.enum';
import { RiskReasonCode } from '../../domain/enums/risk-reason-code.enum';
import { EvaluateRiskDto } from './dto/evaluate-risk.dto';

const VALID_DTO: EvaluateRiskDto = {
  orderId: 'order-uuid-1',
  commandId: 'cmd-uuid-1',
  symbol: 'AAPL',
  quantity: 10,
  limitPrice: 150,
};

describe('Given a risk evaluation request', () => {
  let controller: RiskController;
  let evaluateRisk: { execute: jest.Mock };

  beforeEach(async () => {
    evaluateRisk = { execute: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [RiskController],
      providers: [{ provide: EvaluateRiskUseCase, useValue: evaluateRisk }],
    }).compile();
    controller = module.get(RiskController);
  });

  describe('when POST /v1/risk/evaluate is called for an order within limits', () => {
    it('should return an APPROVED decision with NONE reason code', () => {
      evaluateRisk.execute.mockReturnValue(RiskDecision.approved());
      const result = controller.evaluate(VALID_DTO);
      expect(result.outcome).toBe(RiskDecisionOutcome.APPROVED);
      expect(result.reasonCode).toBe(RiskReasonCode.NONE);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('when POST /v1/risk/evaluate is called for an order exceeding quantity limit', () => {
    it('should return a REJECTED decision with the appropriate reason code and reasons', () => {
      evaluateRisk.execute.mockReturnValue(
        RiskDecision.rejected(RiskReasonCode.QUANTITY_LIMIT_EXCEEDED, ['qty 2000 > 1000']),
      );
      const result = controller.evaluate({ ...VALID_DTO, quantity: 2000 });
      expect(result.outcome).toBe(RiskDecisionOutcome.REJECTED);
      expect(result.reasonCode).toBe(RiskReasonCode.QUANTITY_LIMIT_EXCEEDED);
      expect(result.reasons).toContain('qty 2000 > 1000');
    });
  });

  describe('when POST /v1/risk/evaluate is called with a null limitPrice (MARKET order)', () => {
    it('should forward a null limitPrice to the use case', () => {
      evaluateRisk.execute.mockReturnValue(RiskDecision.approved());
      controller.evaluate({ ...VALID_DTO, limitPrice: null });
      expect(evaluateRisk.execute).toHaveBeenCalledWith(
        expect.objectContaining({ limitPrice: null }),
      );
    });
  });
});
