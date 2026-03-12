import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../mocks/server';
import { usePositionsQuery } from './usePositionsQuery';

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

describe('usePositionsQuery', () => {
  it('Given authenticated user, When query runs, Should return positions', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/positions', () =>
        HttpResponse.json({
          accountId: 'acc-001',
          positions: [
            { accountId: 'acc-001', symbol: 'AAPL', quantity: 100, averageCost: 150.0, marketPrice: 160.0, unrealizedPnl: 1000.0, updatedAt: new Date().toISOString() },
          ],
          totalUnrealizedPnl: 1000.0,
          asOf: new Date().toISOString(),
        }),
      ),
    );

    const { result } = renderHook(() => usePositionsQuery('acc-001'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.positions).toHaveLength(1);
    expect(result.current.data?.positions[0]?.symbol).toBe('AAPL');
    expect(result.current.data?.totalUnrealizedPnl).toBe(1000.0);
  });

  it('Given empty portfolio, When query runs, Should return empty positions array', async () => {
    const { result } = renderHook(() => usePositionsQuery('acc-001'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.positions).toHaveLength(0);
  });
});
