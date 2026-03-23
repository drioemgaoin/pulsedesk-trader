import React from 'react';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@pulsedesk/ui';

const theme = createTheme({ palette: { mode: 'dark' } });

function authReducer(
  state = { token: 'test-token', accountId: 'acc-001', username: 'test', status: 'authenticated', error: null },
  _action: { type: string },
) {
  return state;
}

export function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: { store?: ReturnType<typeof makeStore> },
) {
  const store = options?.store ?? makeStore();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper }), store };
}
