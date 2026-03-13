import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchApi } from '../api/apiClient';
import type { PositionsResponseV1 } from '../api/types';
import type { ShellState } from '../types/store';

export function usePositionsQuery() {
  const token = useSelector((s: ShellState) => s.auth.token);
  const accountId = useSelector((s: ShellState) => s.auth.accountId);

  return useQuery<PositionsResponseV1>({
    queryKey: ['positions', accountId],
    queryFn: () => {
      const params = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
      return fetchApi<PositionsResponseV1>(`/api/v1/positions${params}`, token ?? null);
    },
    staleTime: 5_000,
    refetchInterval: 5_000,
    enabled: true,
  });
}
