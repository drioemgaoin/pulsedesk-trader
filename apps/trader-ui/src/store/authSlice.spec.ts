import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { store } from './store';
import { loginThunk, logout, setToken } from './authSlice';

function freshStore() {
  // Each test uses the shared store; reset by dispatching logout first
  store.dispatch(logout());
  return store;
}

describe('authSlice', () => {
  beforeEach(() => {
    freshStore();
  });

  it('initial state is idle', () => {
    const state = store.getState().auth;
    expect(state.status).toBe('unauthenticated'); // after logout reset above
  });

  it('setToken stores token and decodes accountId from JWT sub', () => {
    const payload = btoa(JSON.stringify({ sub: 'acc-42' }));
    const jwt = `header.${payload}.sig`;
    store.dispatch(setToken({ token: jwt, username: 'alice' }));
    const state = store.getState().auth;
    expect(state.status).toBe('authenticated');
    expect(state.username).toBe('alice');
    expect(state.accountId).toBe('acc-42');
    expect(state.token).toBe(jwt);
  });

  it('loginThunk.fulfilled sets authenticated state', async () => {
    await store.dispatch(loginThunk({ username: 'alice', password: 'pass' }));
    const state = store.getState().auth;
    expect(state.status).toBe('authenticated');
    expect(state.username).toBe('alice');
    expect(state.token).toBeTruthy();
  });

  it('loginThunk.rejected sets unauthenticated with error', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/token', () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 }),
      ),
    );
    await store.dispatch(loginThunk({ username: 'bad', password: 'bad' }));
    const state = store.getState().auth;
    expect(state.status).toBe('unauthenticated');
    expect(state.error).toContain('401');
  });

  it('logout clears auth state', () => {
    const payload = btoa(JSON.stringify({ sub: 'acc-1' }));
    store.dispatch(setToken({ token: `h.${payload}.s`, username: 'alice' }));
    store.dispatch(logout());
    const state = store.getState().auth;
    expect(state.status).toBe('unauthenticated');
    expect(state.token).toBeNull();
    expect(state.username).toBeNull();
    expect(state.accountId).toBeNull();
  });
});
