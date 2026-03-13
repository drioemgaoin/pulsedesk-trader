import React from 'react';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({ palette: { mode: 'dark' } });

function authReducer(
  state = { token: 'test-token', accountId: 'acc-001', username: 'test', status: 'authenticated', error: null },
  _: { type: string },
) {
  return state;
}

export function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: { store?: ReturnType<typeof makeStore>; queryClient?: QueryClient },
) {
  const store = options?.store ?? makeStore();
  const queryClient =
    options?.queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper }), store, queryClient };
}
