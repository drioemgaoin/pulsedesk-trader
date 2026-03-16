import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@pulsedesk/ui';

const theme = createTheme({ palette: { mode: 'dark' } });

type AuthState = { token: string | null; accountId: string | null; username: string | null; status: string; error: null };

interface StoreState {
  auth: AuthState;
}

function authReducer(
  state: AuthState = { token: 'test-token', accountId: 'acc-001', username: 'test', status: 'authenticated', error: null },
  _action: { type: string },
): AuthState {
  return state;
}

export function makeStore(preloadedState?: Partial<StoreState>) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState,
  });
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
      <MemoryRouter>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
          </QueryClientProvider>
        </Provider>
      </MemoryRouter>
    );
  }

  return { ...render(ui, { wrapper: Wrapper }), store, queryClient };
}
