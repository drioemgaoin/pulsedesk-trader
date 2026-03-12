import React from 'react';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({ palette: { mode: 'dark' } });

interface StoreState {
  auth: { token: string | null; accountId: string | null; username: string | null; status: string; error: null };
  terminal: { selectedSymbol: string; connectionStatus: string };
}

function authReducer(
  state = { token: 'test-token', accountId: 'acc-001', username: 'test', status: 'authenticated', error: null },
  action: { type: string; payload?: unknown },
) {
  if (action.type === 'auth/logout') {
    return { ...state, token: null, accountId: null, username: null, status: 'unauthenticated', error: null };
  }
  return state;
}

function terminalReducer(
  state = { selectedSymbol: 'AAPL', connectionStatus: 'connecting' },
  action: { type: string; payload?: unknown },
) {
  if (action.type === 'terminal/setSelectedSymbol') {
    return { ...state, selectedSymbol: action.payload as string };
  }
  if (action.type === 'terminal/setConnectionStatus') {
    return { ...state, connectionStatus: action.payload as string };
  }
  return state;
}

export function makeStore(preloadedState?: Partial<StoreState>) {
  return configureStore({
    reducer: { auth: authReducer, terminal: terminalReducer },
    preloadedState,
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: { store?: ReturnType<typeof makeStore> },
) {
  const store = options?.store ?? makeStore();
  const queryClient = new QueryClient({
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
