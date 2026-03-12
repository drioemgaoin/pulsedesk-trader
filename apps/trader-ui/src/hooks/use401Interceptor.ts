import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch } from '../store/store';
import { logout } from '../store/authSlice';

export function use401Interceptor(): void {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const originalFetchRef = useRef<typeof fetch>(window.fetch.bind(window));

  useEffect(() => {
    const originalFetch = originalFetchRef.current;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const res = await originalFetch(input, init);

      if (res.status === 401 && !url.includes('/auth/')) {
        dispatch(logout());
        void navigate('/login?reason=session_expired');
      }

      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [dispatch, navigate]);
}
