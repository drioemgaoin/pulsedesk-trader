export interface EvaluateRiskCommand {
  orderId: string;
  commandId: string;
  symbol: string;
  quantity: number;
  limitPrice: number | null;
}
