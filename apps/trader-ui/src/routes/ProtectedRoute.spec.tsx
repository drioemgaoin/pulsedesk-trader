import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setToken, logout, loginThunk } from '../store/authSlice';
import terminalReducer from '../store/terminalSlice';
import ProtectedRoute from './ProtectedRoute';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, terminal: terminalReducer } });
}

function renderWithAuth(store: ReturnType<typeof makeStore>, initialPath = '/protected') {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    const store = makeStore();
    const payload = btoa(JSON.stringify({ sub: 'acc-1' }));
    store.dispatch(setToken({ token: `h.${payload}.s`, username: 'alice' }));
    renderWithAuth(store);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', () => {
    const store = makeStore();
    store.dispatch(logout());
    renderWithAuth(store);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when status is idle', () => {
    // idle = fresh page load with no token; should redirect to /login immediately
    const store = makeStore();
    renderWithAuth(store);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders nothing when status is loading', () => {
    // loading = loginThunk in-flight; render null until it resolves
    const store = makeStore();
    store.dispatch(loginThunk.pending('', { username: '', password: '' }));
    const { container } = renderWithAuth(store);
    expect(container.textContent).toBe('');
  });
});
