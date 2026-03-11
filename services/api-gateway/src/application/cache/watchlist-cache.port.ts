import type { WatchlistResponseV1 } from '@pulsedesk/contracts';

export const WATCHLIST_CACHE = Symbol('IWatchlistCache');

export interface IWatchlistCache {
  get(): Promise<WatchlistResponseV1 | null>;
  set(data: WatchlistResponseV1): Promise<void>;
}
