import React from 'react';
import type { Decorator } from '@storybook/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  authReducer,
  terminalReducer,
  themeReducer,
  setToken,
  logout,
} from '@pulsedesk/trader-ui';

/**
 * A valid JWT that decodes to { sub: 'acc-demo-001', username: 'demo', exp: 9999999999 }
 * Used to pre-populate the Redux auth state so stories render authenticated pages.
 */
const MOCK_TOKEN = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiJhY2MtZGVtby0wMDEiLCJ1c2VybmFtZSI6ImRlbW8iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0',
  'mock_signature',
].join('.');

/**
 * Per-story provider configuration via story parameters.
 *
 * Usage in a story file:
 *   parameters: {
 *     storyProviders: {
 *       authenticated: false,          // skip setToken dispatch (default: true)
 *       initialPath: '/login?reason=session_expired',  // MemoryRouter start path
 *       preloadedState: {              // RTK preloaded state slice overrides
 *         auth: { status: 'unauthenticated', error: '401: Bad credentials', ... },
 *       },
 *     },
 *   }
 */
export interface StoryProviderParams {
  authenticated?: boolean;
  initialPath?: string;
  preloadedState?: Record<string, unknown>;
}

type ThemeMode = 'dark' | 'light';
type StoryThemeState = { mode: ThemeMode; paletteMode: ThemeMode };
const toMode = (value: unknown): ThemeMode => (value === 'light' ? 'light' : 'dark');

function createStoryStore(params?: StoryProviderParams, themeMode: ThemeMode = 'dark') {
  const incomingTheme =
    (params?.preloadedState?.['theme'] as Record<string, unknown> | undefined) ?? {};
  const themeState: StoryThemeState = {
    mode: themeMode,
    paletteMode: themeMode,
    ...(incomingTheme as Partial<StoryThemeState>),
  };

  const preloadedState = {
    ...(params?.preloadedState ?? {}),
    theme: themeState,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeConfig: any = {
    reducer: { auth: authReducer, terminal: terminalReducer, theme: themeReducer },
    preloadedState,
  };
  const store = configureStore(storeConfig);

  if (params?.authenticated === false) {
    // authReducer's initialState calls loadPersistedAuth() at module load time.
    // If the developer has a valid JWT in localStorage the store would start as
    // 'authenticated', causing LoginPage to immediately navigate('/trading') and
    // clear any ?reason= search params before the component can read them.
    // Dispatching logout() guarantees status='unauthenticated' regardless of what
    // is persisted on disk — unless the caller already set auth via preloadedState.
    if (!params?.preloadedState?.['auth']) {
      store.dispatch(logout());
    }
  } else {
    // Pre-populate with an authenticated state so page components render immediately
    store.dispatch(setToken({ token: MOCK_TOKEN, username: 'demo' }));
  }

  return store;
}

export const withProviders: Decorator = (Story, context) => {
  const params = (context.parameters?.storyProviders ?? {}) as StoryProviderParams;
  const themeMode = toMode(context.globals?.['colorMode']);

  const store = React.useMemo(() => createStoryStore(params, themeMode), [context.id, themeMode]);

  // Fresh QueryClient per story — prevents React Query cache leakage between stories
  const queryClient = React.useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
            gcTime: 0,
            refetchOnWindowFocus: false,
            refetchInterval: false,
            refetchIntervalInBackground: false,
          },
          mutations: { retry: false },
        },
        }),
    [context.id],
  );

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[params.initialPath ?? '/']} initialIndex={0}>
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
};
