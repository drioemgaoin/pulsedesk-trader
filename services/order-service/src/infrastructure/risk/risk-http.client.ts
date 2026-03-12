import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CircuitBreaker = require('opossum') as typeof import('opossum');
import { IRiskClient, RiskEvaluationRequest, RiskEvaluationResult } from '../../domain/ports/risk-client.port';

@Injectable()
export class RiskHttpClient implements IRiskClient, OnModuleInit {
  private readonly logger = new Logger(RiskHttpClient.name);
  private breaker!: import('opossum')<[RiskEvaluationRequest], RiskEvaluationResult>;

  onModuleInit(): void {
    const riskServiceUrl = process.env['RISK_SERVICE_URL'];
    const timeoutMs = parseInt(process.env['RISK_SERVICE_TIMEOUT_MS'] ?? '2000', 10);
    const apiKey = process.env['INTERNAL_RISK_API_KEY'] ?? '';

    if (!riskServiceUrl) {
      this.logger.warn('RISK_SERVICE_URL is not set — risk evaluation will always fail (fail-closed)');
    }

    const call = async (req: RiskEvaluationRequest): Promise<RiskEvaluationResult> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${riskServiceUrl ?? ''}/v1/risk/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            orderId: req.orderId,
            commandId: req.commandId,
            symbol: req.symbol,
            quantity: req.quantity,
            limitPrice: req.limitPrice,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Risk service returned HTTP ${response.status}`);
        }

        return (await response.json()) as RiskEvaluationResult;
      } finally {
        clearTimeout(timer);
      }
    };

    this.breaker = new CircuitBreaker(call, {
      timeout: timeoutMs,
      errorThresholdPercentage: 50,
      resetTimeout: 10_000,
      volumeThreshold: 5,
      capacity: 30, // bulkhead: max 30 concurrent in-flight risk evaluations
    });

    this.breaker.on('open', () => this.logger.warn('Risk service circuit breaker OPEN'));
    this.breaker.on('halfOpen', () => this.logger.log('Risk service circuit breaker HALF-OPEN'));
    this.breaker.on('close', () => this.logger.log('Risk service circuit breaker CLOSED'));
  }

  async evaluate(req: RiskEvaluationRequest): Promise<RiskEvaluationResult> {
    return this.breaker.fire(req);
  }
}
