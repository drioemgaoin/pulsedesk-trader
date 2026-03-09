// Kafka event contracts — Market domain
// schemaVersion must increment on breaking changes

export interface MarketTickEvent {
  eventType: 'market.tick';
  schemaVersion: 1;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
}
