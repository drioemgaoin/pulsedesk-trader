export interface RiskLimits {
  maxQuantity: number;
  maxNotional: number;
}

export function risksLimitsFromEnv(): RiskLimits {
  return {
    maxQuantity: parseFloat(process.env['RISK_MAX_QUANTITY'] ?? '1000'),
    maxNotional: parseFloat(process.env['RISK_MAX_NOTIONAL'] ?? '100000'),
  };
}
