import { RiskDecision } from './risk-decision';
import { RiskDecisionOutcome } from './enums/risk-decision-outcome.enum';
import { RiskReasonCode } from './enums/risk-reason-code.enum';

describe('Given no limit violations', () => {
  describe('when RiskDecision.approved is called', () => {
    it('should return a decision with APPROVED outcome and NONE reason code', () => {
      const d = RiskDecision.approved();
      expect(d.outcome).toBe(RiskDecisionOutcome.APPROVED);
      expect(d.reasonCode).toBe(RiskReasonCode.NONE);
      expect(d.reasons).toHaveLength(0);
    });

    it('should report isApproved as true', () => {
      expect(RiskDecision.approved().isApproved).toBe(true);
    });
  });
});

describe('Given a limit violation', () => {
  describe('when RiskDecision.rejected is called with a reason code and reasons', () => {
    it('should return a decision with REJECTED outcome and the provided reason code', () => {
      const d = RiskDecision.rejected(RiskReasonCode.QUANTITY_LIMIT_EXCEEDED, ['qty 2000 > 1000']);
      expect(d.outcome).toBe(RiskDecisionOutcome.REJECTED);
      expect(d.reasonCode).toBe(RiskReasonCode.QUANTITY_LIMIT_EXCEEDED);
      expect(d.reasons).toEqual(['qty 2000 > 1000']);
    });

    it('should report isApproved as false', () => {
      expect(RiskDecision.rejected(RiskReasonCode.NOTIONAL_LIMIT_EXCEEDED, ['reason']).isApproved).toBe(false);
    });
  });
});
