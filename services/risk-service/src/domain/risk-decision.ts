import { RiskDecisionOutcome } from './enums/risk-decision-outcome.enum';
import { RiskReasonCode } from './enums/risk-reason-code.enum';

export interface RiskDecisionProps {
  outcome: RiskDecisionOutcome;
  reasonCode: RiskReasonCode;
  reasons: string[];
}

export class RiskDecision {
  readonly outcome: RiskDecisionOutcome;
  readonly reasonCode: RiskReasonCode;
  readonly reasons: string[];

  constructor(props: RiskDecisionProps) {
    this.outcome = props.outcome;
    this.reasonCode = props.reasonCode;
    this.reasons = props.reasons;
  }

  get isApproved(): boolean {
    return this.outcome === RiskDecisionOutcome.APPROVED;
  }

  static approved(): RiskDecision {
    return new RiskDecision({
      outcome: RiskDecisionOutcome.APPROVED,
      reasonCode: RiskReasonCode.NONE,
      reasons: [],
    });
  }

  static rejected(reasonCode: RiskReasonCode, reasons: string[]): RiskDecision {
    return new RiskDecision({
      outcome: RiskDecisionOutcome.REJECTED,
      reasonCode,
      reasons,
    });
  }
}
