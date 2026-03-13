import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchApi } from '../api/apiClient';
import type { OrdersPageV1 } from '../api/types';
import type { OrderFilters } from '../lib/filters';
import { buildQueryString } from '../lib/filters';
import type { ShellState } from '../types/store';

export const PAGE_SIZE = 25;

export function useOrdersQuery(page: number, filters: OrderFilters) {
  const token = useSelector((s: ShellState) => s.auth.token);
  const accountId = useSelector((s: ShellState) => s.auth.accountId) ?? '';

  return useQuery<OrdersPageV1>({
    queryKey: ['orders', { page, filters }],
    queryFn: () => {
      const qs = buildQueryString(accountId, page, filters, PAGE_SIZE);
      return fetchApi<OrdersPageV1>(`/api/v1/orders${qs}`, token ?? null);
    },
    staleTime: 3_000,
    refetchInterval: 3_000,
    placeholderData: (prev) => prev,
  });
}
