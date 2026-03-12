import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const API_BASE_URL =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? 'http://localhost:3000';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  token: string | null;
  username: string | null;
  accountId: string | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  username: null,
  accountId: null,
  status: 'idle',
  error: null,
};

function decodeAccountId(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const padded = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded);
    const data = JSON.parse(json) as Record<string, unknown>;
    if (typeof data['sub'] === 'string') return data['sub'];
    if (typeof data['accountId'] === 'string') return data['accountId'];
    return null;
  } catch {
    return null;
  }
}

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
    },
    setToken(state, action: PayloadAction<{ token: string; username: string }>) {
      state.token = action.payload.token;
      state.username = action.payload.username;
      state.accountId = decodeAccountId(action.payload.token);
      state.status = 'authenticated';
      state.error = null;
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
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.token = null;
        state.username = null;
        state.accountId = null;
        state.status = 'unauthenticated';
        state.error = action.payload ?? action.error.message ?? 'Login failed';
      });
  },
});

export const { logout, setToken } = authSlice.actions;
export default authSlice.reducer;
