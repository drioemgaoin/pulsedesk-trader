import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchApi } from '../api/apiClient';
import type { OrderResponseV1, SubmitOrderRequestV1 } from '../api/types';
import type { ShellState } from '../types/store';

export function useSubmitOrderMutation() {
  const token = useSelector((s: ShellState) => s.auth.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: SubmitOrderRequestV1) =>
      fetchApi<OrderResponseV1>('/api/v1/orders', token, {
        method: 'POST',
        body: JSON.stringify({
          commandId: req.idempotencyKey,
          accountId: req.accountId,
          symbol: req.symbol,
          side: req.side,
          type: req.type,
          quantity: req.quantity,
          limitPrice: req.limitPrice,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
