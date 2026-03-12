import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchApi } from '../api/apiClient';
import type { PositionsResponseV1 } from '../api/types';
import type { ShellState } from '../types/store';

export function usePositionsQuery(accountId: string) {
  const token = useSelector((s: ShellState) => s.auth.token);

  return useQuery({
    queryKey: ['positions', accountId],
    queryFn: () =>
      fetchApi<PositionsResponseV1>(
        `/api/v1/positions?accountId=${encodeURIComponent(accountId)}`,
        token,
      ),
    refetchInterval: 5_000,
    enabled: !!token && !!accountId,
  });
}
