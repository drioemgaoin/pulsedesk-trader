export const RISK_CLIENT = Symbol('IRiskClient');

export interface RiskEvaluationRequest {
  orderId: string;
  commandId: string;
  symbol: string;
  quantity: number;
  limitPrice: number | null;
}

export interface RiskEvaluationResult {
  outcome: 'APPROVED' | 'REJECTED';
  reasonCode: string;
  reasons: string[];
}

export interface IRiskClient {
  evaluate(req: RiskEvaluationRequest): Promise<RiskEvaluationResult>;
}
