export const RISK_METRICS = Symbol('IRiskMetrics');

export interface IRiskMetrics {
  recordEvaluation(outcome: string, latencyMs: number): void;
}
