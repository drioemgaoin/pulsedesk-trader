import { Inject, Injectable, Logger } from '@nestjs/common';
import { RiskDecision } from '../../domain/risk-decision';
import { RiskReasonCode } from '../../domain/enums/risk-reason-code.enum';
import { RiskLimits, risksLimitsFromEnv } from '../../domain/risk-limits';
import { IRiskMetrics, RISK_METRICS } from '../../domain/ports/risk-metrics.port';
import { EvaluateRiskCommand } from '../commands/evaluate-risk.command';

@Injectable()
export class EvaluateRiskUseCase {
  private readonly logger = new Logger(EvaluateRiskUseCase.name);

  constructor(
    @Inject(RISK_METRICS) private readonly metrics: IRiskMetrics,
  ) {}

  execute(cmd: EvaluateRiskCommand, limits?: RiskLimits): RiskDecision {
    const start = Date.now();
    const resolvedLimits = limits ?? risksLimitsFromEnv();
    const decision = this.evaluate(cmd, resolvedLimits);
    const latencyMs = Date.now() - start;

    this.metrics.recordEvaluation(decision.outcome, latencyMs);
    this.logger.log({
      msg: 'risk evaluated',
      orderId: cmd.orderId,
      commandId: cmd.commandId,
      symbol: cmd.symbol,
      quantity: cmd.quantity,
      limitPrice: cmd.limitPrice,
      outcome: decision.outcome,
      reasonCode: decision.reasonCode,
      latencyMs,
    });

    return decision;
  }

  private evaluate(cmd: EvaluateRiskCommand, limits: RiskLimits): RiskDecision {
    const violations: RiskReasonCode[] = [];
    const reasons: string[] = [];

    if (cmd.quantity > limits.maxQuantity) {
      violations.push(RiskReasonCode.QUANTITY_LIMIT_EXCEEDED);
      reasons.push(`quantity ${cmd.quantity} exceeds limit ${limits.maxQuantity}`);
    }

    if (cmd.limitPrice !== null) {
      const notional = cmd.quantity * cmd.limitPrice;
      if (notional > limits.maxNotional) {
        violations.push(RiskReasonCode.NOTIONAL_LIMIT_EXCEEDED);
        reasons.push(`notional ${notional.toFixed(2)} exceeds limit ${limits.maxNotional}`);
      }
    }

    if (violations.length === 0) {
      return RiskDecision.approved();
    }

    const reasonCode = violations.length > 1
      ? RiskReasonCode.MULTIPLE_LIMITS_EXCEEDED
      : violations[0];

    return RiskDecision.rejected(reasonCode, reasons);
  }
}
