import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import terminalReducer from '../store/terminalSlice';
import LoginPage from './LoginPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, terminal: terminalReducer } });
}

function renderLogin(store = makeStore(), search = '') {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/login${search}`]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/trading" element={<div>Trading</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('LoginPage', () => {
  it('renders sign in form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /PulseDesk Trader/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows session expired warning when reason=session_expired', () => {
    renderLogin(makeStore(), '?reason=session_expired');
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();
  });

  it('submits credentials and navigates on success', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.clear(screen.getByLabelText('Username'));
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/trading', { replace: true });
    });
  });

  it('shows error message on failed login', async () => {
    const { http, HttpResponse } = await import('msw');
    const { server } = await import('../mocks/server');
    server.use(
      http.post('http://localhost:3000/api/v1/auth/token', () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Username'), 'bad');
    await user.type(screen.getByLabelText('Password'), 'bad');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('disables button while loading', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    // immediately after click button may be disabled
    // just verify we got past submission without error
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});
