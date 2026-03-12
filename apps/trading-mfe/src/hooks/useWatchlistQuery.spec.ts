import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '../mocks/server';
import { useWatchlistQuery } from './useWatchlistQuery';

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

describe('useWatchlistQuery', () => {
  it('Given authenticated user, When query runs, Should return watchlist symbols', async () => {
    const { result } = renderHook(() => useWatchlistQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN']);
  });

  it('Given server error, When query runs, Should set error state', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/watchlist', () =>
        HttpResponse.json({ message: 'Internal error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useWatchlistQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
