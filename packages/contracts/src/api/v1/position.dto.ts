// API v1 — Position DTOs

export interface PositionV1 {
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  marketPrice: number;
  unrealizedPnl: number;
  updatedAt: string;
}

export interface PositionsResponseV1 {
  accountId: string;
  positions: PositionV1[];
  totalUnrealizedPnl: number;
  asOf: string;
}
