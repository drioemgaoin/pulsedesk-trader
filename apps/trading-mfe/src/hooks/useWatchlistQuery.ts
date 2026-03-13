import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchApi } from '../api/apiClient';
import type { WatchlistResponseV1 } from '../api/types';
import type { ShellState } from '../types/store';

const DEFAULT_SYMBOLS = (
  (import.meta.env['VITE_WATCHLIST_SYMBOLS'] as string | undefined) ??
  'AAPL,TSLA,MSFT,NVDA,AMZN'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function useWatchlistQuery() {
  const token = useSelector((s: ShellState) => s.auth.token);

  return useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await fetchApi<WatchlistResponseV1>('/api/v1/watchlist', token);
      return res.quotes.map((q) => q.symbol);
    },
    staleTime: 1_000,
    refetchInterval: 2_000,
    enabled: !!token,
    // Fall back to env-var symbols if the query has no data yet
    placeholderData: DEFAULT_SYMBOLS,
  });
}
