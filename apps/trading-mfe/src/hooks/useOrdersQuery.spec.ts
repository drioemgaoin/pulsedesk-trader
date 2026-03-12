import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../mocks/server';
import { useOrdersQuery } from './useOrdersQuery';

function makeWrapper() {
  const store = configureStore({
    reducer: {
      auth: () => ({ token: 'test-token', accountId: 'acc-001' }),
      terminal: () => ({ selectedSymbol: 'AAPL', connectionStatus: 'connecting' }),
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store },
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    );
}

describe('useOrdersQuery', () => {
  it('Given authenticated user, When query runs, Should return orders page', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/orders', () =>
        HttpResponse.json({
          orders: [
            { orderId: 'ord-1', idempotencyKey: 'k1', accountId: 'acc-001', symbol: 'AAPL', side: 'BUY', type: 'MARKET', quantity: 10, status: 'FILLED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
          pagination: { limit: 50, offset: 0, total: 1 },
        }),
      ),
    );

    const { result } = renderHook(() => useOrdersQuery('acc-001'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.orders).toHaveLength(1);
    expect(result.current.data?.orders[0]?.orderId).toBe('ord-1');
  });

  it('Given server error, When query runs, Should set error state', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/orders', () =>
        HttpResponse.json({ message: 'Internal error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useOrdersQuery('acc-001'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Given status filter, When query runs, Should pass status param to API', async () => {
    let capturedUrl = '';
    server.use(
      http.get('http://localhost:3000/api/v1/orders', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ orders: [], pagination: { limit: 50, offset: 0, total: 0 } });
      }),
    );

    const { result } = renderHook(() => useOrdersQuery('acc-001', 'FILLED'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedUrl).toContain('status=FILLED');
  });
});
