import { useEffect, useState } from 'react';

const API_BASE_URL =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'http://localhost:3010';
const DEMO_USERNAME =
  (import.meta.env['VITE_DEMO_USERNAME'] as string | undefined) ?? 'trader';
const DEMO_PASSWORD =
  (import.meta.env['VITE_DEMO_PASSWORD'] as string | undefined) ?? 'pulsedesk';

export type AuthStatus = 'loading' | 'ready' | 'error';

export interface AuthState {
  token: string | null;
  accountId: string | null;
  status: AuthStatus;
}

function decodeAccountId(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // Pad base64url to base64
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const data = JSON.parse(json) as Record<string, unknown>;
    if (typeof data['accountId'] === 'string') return data['accountId'];
    if (typeof data['sub'] === 'string') return data['sub'];
    return null;
  } catch {
    return null;
  }
}

async function login(): Promise<{ token: string; accountId: string | null }> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: DEMO_USERNAME, password: DEMO_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  const token = typeof data['accessToken'] === 'string' ? data['accessToken'] : String(data['token'] ?? '');
  const accountId = decodeAccountId(token);
  return { token, accountId };
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    token: null,
    accountId: null,
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function attempt(): Promise<void> {
      try {
        attempts += 1;
        const { token, accountId } = await login();
        if (!cancelled) {
          setState({ token, accountId, status: 'ready' });
        }
      } catch {
        if (cancelled) return;
        if (attempts < 2) {
          await attempt();
        } else {
          setState({ token: null, accountId: null, status: 'error' });
        }
      }
    }

    void attempt();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
