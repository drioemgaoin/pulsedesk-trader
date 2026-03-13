import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchApi } from '../api/apiClient';
import type { OrderResponseV1 } from '../api/types';
import type { ShellState } from '../types/store';

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  const token = useSelector((s: ShellState) => s.auth.token);

  return useMutation<OrderResponseV1, Error, string>({
    mutationFn: (orderId: string) =>
      fetchApi<OrderResponseV1>(`/api/v1/orders/${orderId}/cancel`, token ?? null, {
        method: 'POST',
      }),

    onMutate: async (orderId) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['orders'] });

      // Snapshot previous data
      const previousData = queryClient.getQueriesData<{ orders: OrderResponseV1[] }>({
        queryKey: ['orders'],
      });

      // Optimistically mark the row as CANCELLED
      queryClient.setQueriesData<{ orders: OrderResponseV1[]; pagination: unknown }>(
        { queryKey: ['orders'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.map((o) =>
              o.id === orderId ? { ...o, status: 'CANCELLED' as const } : o,
            ),
          };
        },
      );

      return { previousData };
    },

    onError: (_err, _orderId, context) => {
      // Rollback
      if (context && typeof context === 'object' && 'previousData' in context) {
        const ctx = context as { previousData: [unknown, unknown][] };
        for (const [queryKey, data] of ctx.previousData) {
          queryClient.setQueryData(queryKey as Parameters<typeof queryClient.setQueryData>[0], data);
        }
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
