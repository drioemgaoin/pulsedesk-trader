// Kafka event contracts — Portfolio domain

export interface PortfolioUpdatedEvent {
  eventType: 'portfolio.updated';
  schemaVersion: 1;
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  unrealizedPnl: number;
  timestamp: string;
}
