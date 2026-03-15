import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const API_BASE_URL =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'http://localhost:3000';

const STORAGE_KEY = 'pulsedesk_auth';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  token: string | null;
  username: string | null;
  accountId: string | null;
  status: AuthStatus;
  error: string | null;
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

function decodeTokenPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const padded = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodeAccountId(jwt: string): string | null {
  const data = decodeTokenPayload(jwt);
  if (!data) return null;
  if (typeof data['sub'] === 'string') return data['sub'];
  if (typeof data['accountId'] === 'string') return data['accountId'];
  return null;
}

function isTokenExpired(jwt: string): boolean {
  const data = decodeTokenPayload(jwt);
  if (!data) return true;
  const exp = data['exp'];
  if (typeof exp !== 'number') return false; // no expiry claim → treat as valid
  return Date.now() / 1000 > exp;
}

// ── localStorage persistence ──────────────────────────────────────────────────

interface PersistedAuth {
  token: string;
  username: string;
}

function saveAuth(token: string, username: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, username } satisfies PersistedAuth));
  } catch {
    // storage quota or private-mode — fail silently
  }
}

function clearAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function loadPersistedAuth(): { token: string; username: string; accountId: string | null } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAuth;
    if (!parsed.token || !parsed.username) return null;
    if (isTokenExpired(parsed.token)) {
      clearAuth();
      return null;
    }
    return { token: parsed.token, username: parsed.username, accountId: decodeAccountId(parsed.token) };
  } catch {
    return null;
  }
}

// ── Initial state — restored from localStorage if a valid token exists ────────

const persisted = loadPersistedAuth();

const initialState: AuthState = persisted
  ? { token: persisted.token, username: persisted.username, accountId: persisted.accountId, status: 'authenticated', error: null }
  : { token: null, username: null, accountId: null, status: 'idle', error: null };

// ── Thunks ────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  username: string;
}

export const loginThunk = createAsyncThunk<
  LoginResponse,
  LoginCredentials,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    return rejectWithValue(`${res.status}: ${text}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const accessToken =
    typeof data['accessToken'] === 'string' ? data['accessToken'] : String(data['token'] ?? '');
  return { accessToken, username: credentials.username };
});

// ── Slice ─────────────────────────────────────────────────────────────────────

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.username = null;
      state.accountId = null;
      state.status = 'unauthenticated';
      state.error = null;
      clearAuth();
    },
    setToken(state, action: PayloadAction<{ token: string; username: string }>) {
      state.token = action.payload.token;
      state.username = action.payload.username;
      state.accountId = decodeAccountId(action.payload.token);
      state.status = 'authenticated';
      state.error = null;
      saveAuth(action.payload.token, action.payload.username);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.token = action.payload.accessToken;
        state.username = action.payload.username;
        state.accountId = decodeAccountId(action.payload.accessToken);
        state.status = 'authenticated';
        state.error = null;
        saveAuth(action.payload.accessToken, action.payload.username);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.token = null;
        state.username = null;
        state.accountId = null;
        state.status = 'unauthenticated';
        state.error = action.payload ?? action.error.message ?? 'Login failed';
        clearAuth();
      });
  },
});

export const { logout, setToken } = authSlice.actions;
export default authSlice.reducer;
