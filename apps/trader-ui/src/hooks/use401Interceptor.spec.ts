import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { server } from '../mocks/server';
import authReducer, { setToken } from '../store/authSlice';
import terminalReducer from '../store/terminalSlice';
import { use401Interceptor } from './use401Interceptor';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, terminal: terminalReducer } });
}

function wrapper(testStore: ReturnType<typeof makeStore>) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store: testStore },
      React.createElement(MemoryRouter, null, children),
    );
}

describe('use401Interceptor', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('dispatches logout and navigates on 401 from non-auth endpoint', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/orders', () =>
        new HttpResponse(null, { status: 401 }),
      ),
    );
    const testStore = makeStore();
    const payload = btoa(JSON.stringify({ sub: 'acc-1' }));
    testStore.dispatch(setToken({ token: `h.${payload}.s`, username: 'alice' }));

    renderHook(() => use401Interceptor(), { wrapper: wrapper(testStore) });

    await fetch('http://localhost:3000/api/v1/orders');

    expect(testStore.getState().auth.status).toBe('unauthenticated');
    expect(mockNavigate).toHaveBeenCalledWith('/login?reason=session_expired');
  });

  it('does not intercept /auth/ endpoints', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/auth/token', () =>
        new HttpResponse(null, { status: 401 }),
      ),
    );
    const testStore = makeStore();
    renderHook(() => use401Interceptor(), { wrapper: wrapper(testStore) });

    await fetch('http://localhost:3000/api/v1/auth/token', { method: 'POST' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
