import type { Meta, StoryObj } from '@storybook/react';
import { LoginPage } from '@pulsedesk/trader-ui';
import { http, HttpResponse } from 'msw';

const API_V1 = '*/api/v1';

// Shared auth error preloaded state — mirrors what loginThunk.rejected produces
const failedAuthState = {
  token: null,
  username: null,
  accountId: null,
  status: 'unauthenticated' as const,
  error: '401: Invalid username or password',
};

const meta: Meta<typeof LoginPage> = {
  title: 'Pages/LoginPage',
  component: LoginPage,
  tags: [],
  parameters: {
    layout: 'fullscreen',
    // All login stories show the unauthenticated form — no auto-navigate to /trading
    storyProviders: { authenticated: false },
  },
};
export default meta;
type Story = StoryObj<typeof LoginPage>;

/** Clean login form, no prior state. */
export const Default: Story = {
  name: 'Sign In',
};

/**
 * After a failed login attempt — the error banner is shown.
 * The Redux store is pre-loaded with the rejected auth state so no form submission is needed.
 */
export const LoginError: Story = {
  name: 'Login Error',
  parameters: {
    storyProviders: {
      authenticated: false,
      preloadedState: { auth: failedAuthState },
    },
    // Keep the 401 handler so re-submitting the form also fails
    msw: {
      handlers: [
        http.post(`${API_V1}/auth/token`, () =>
          HttpResponse.json(
            { message: 'Invalid username or password' },
            { status: 401 },
          ),
        ),
      ],
    },
  },
};

/**
 * Arrived here because a session expired — the warning banner is shown.
 * Driven by the ?reason=session_expired query param, same as the real app.
 */
export const SessionExpired: Story = {
  name: 'Session Expired',
  parameters: {
    storyProviders: {
      authenticated: false,
      initialPath: '/login?reason=session_expired',
    },
  },
};
