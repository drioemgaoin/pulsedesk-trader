import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../mocks/server';
import { useSubmitOrderMutation } from './useSubmitOrderMutation';

function makeWrapper() {
  const store = configureStore({
    reducer: {
      auth: () => ({ token: 'test-token', accountId: 'acc-001' }),
      terminal: () => ({ selectedSymbol: 'AAPL', connectionStatus: 'connecting' }),
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  return { store, queryClient, wrapper: ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store },
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    ),
  };
}

describe('useSubmitOrderMutation', () => {
  it('Given valid order, When mutation fires, Should return created order', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSubmitOrderMutation(), { wrapper });

    act(() => {
      result.current.mutate({
        idempotencyKey: 'key-001',
        accountId: 'acc-001',
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 10,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.orderId).toBe('ord-001');
  });

  it('Given server error, When mutation fires, Should set error state', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/orders', () =>
        HttpResponse.json({ message: 'Insufficient funds' }, { status: 422 }),
      ),
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSubmitOrderMutation(), { wrapper });

    act(() => {
      result.current.mutate({
        idempotencyKey: 'key-001',
        accountId: 'acc-001',
        symbol: 'AAPL',
        side: 'BUY',
        type: 'MARKET',
        quantity: 10,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Insufficient funds');
  });

  it('Given successful submit, When onSuccess fires, Should invalidate orders and positions queries', async () => {
    const { wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSubmitOrderMutation(), { wrapper });

    act(() => {
      result.current.mutate({
        idempotencyKey: 'key-002',
        accountId: 'acc-001',
        symbol: 'TSLA',
        side: 'SELL',
        type: 'MARKET',
        quantity: 5,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['orders'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['positions'] }));
  });
});
