import type { MarketTickEvent } from '@pulsedesk/contracts';

export const MARKET_TICK_BROADCASTER = Symbol('IMarketTickBroadcaster');

export interface IMarketTickBroadcaster {
  broadcast(event: MarketTickEvent): void;
}
