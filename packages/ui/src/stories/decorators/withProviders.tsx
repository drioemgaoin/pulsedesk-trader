import React from 'react';
import type { Decorator } from '@storybook/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Import the REAL reducers from the actual source files.
// Storybook's Vite config resolves these through the monorepo workspace symlinks.
import authReducer from '../../../../apps/trader-ui/src/store/authSlice';
import terminalReducer from '../../../../apps/trader-ui/src/store/terminalSlice';
import themeReducer from '../../../../apps/trader-ui/src/store/themeSlice';
import { setToken } from '../../../../apps/trader-ui/src/store/authSlice';
import { MOCK_TOKEN, MOCK_ACCOUNT_ID } from '../fixtures/data';

/**
 * Creates a fresh Redux store per story render.
 * Uses the REAL reducers so Storybook behaviour is identical to the live app.
 */
function makeStore() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      terminal: terminalReducer,
      theme: themeReducer,
    },
  });

  // Put the store in authenticated state so all MFE pages render their main content.
  store.dispatch(
    setToken({ token: MOCK_TOKEN, username: 'demo' }),
  );

  return store;
}

/**
 * Creates a fresh QueryClient per story.
 * retry: false and staleTime: 0 ensure MSW handlers are always hit immediately.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });
}

/**
 * Unified story decorator that provides:
 *   - Redux store (authenticated state, real reducers)
 *   - React Query client (fresh per story, no retries)
 *   - MemoryRouter (satisfies useNavigate / Link in page components)
 */
export const withProviders: Decorator = (Story) => {
  const store = React.useMemo(() => makeStore(), []);
  const queryClient = React.useMemo(() => makeQueryClient(), []);

  return (
    <MemoryRouter initialEntries={['/']}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      </Provider>
    </MemoryRouter>
  );
};
