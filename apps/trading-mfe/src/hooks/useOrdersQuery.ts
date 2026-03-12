import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchApi } from '../api/apiClient';
import type { OrdersPageV1 } from '../api/types';
import type { ShellState } from '../types/store';

export function useOrdersQuery(accountId: string, status?: string, limit = 50, offset = 0) {
  const token = useSelector((s: ShellState) => s.auth.token);

  return useQuery({
    queryKey: ['orders', accountId, status, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({ accountId, limit: String(limit), offset: String(offset) });
      if (status) params.set('status', status);
      return fetchApi<OrdersPageV1>(`/api/v1/orders?${params.toString()}`, token);
    },
    refetchInterval: 3_000,
    enabled: !!token && !!accountId,
  });
}
