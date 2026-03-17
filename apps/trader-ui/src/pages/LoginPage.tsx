import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
  BrandWordmark,
} from '@pulsedesk/ui';
import type { AppDispatch, RootState } from '../store/store';
import { loginThunk } from '../store/authSlice';
import { setAuthToken } from '../api/client';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  useDocumentTitle('Sign In — PulseDesk Trader');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status, error, token } = useSelector((s: RootState) => s.auth);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    defaultValues: {
      username: import.meta.env.DEV ? (import.meta.env['VITE_DEMO_USERNAME'] ?? '') : '',
      password: import.meta.env.DEV ? (import.meta.env['VITE_DEMO_PASSWORD'] ?? '') : '',
    },
  });

  useEffect(() => {
    if (status === 'authenticated' && token) {
      setAuthToken(token);
      void navigate('/trading', { replace: true });
    }
  }, [status, token, navigate]);

  const onSubmit = (values: LoginFormValues) => {
    void dispatch(loginThunk(values));
  };

  const sessionExpired = searchParams.get('reason') === 'session_expired';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--pd-bg-canvas)',
        /* Subtle grid pattern for depth */
        backgroundImage: (t) =>
          `radial-gradient(${t.palette.divider} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
      }}
    >
      <Box
        component="main"
        aria-label="Login form"
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: 'var(--pd-bg-surface)',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Gold accent top bar */}
        <Box sx={{ height: 3, bgcolor: 'primary.main', width: '100%' }} />

        <Box sx={{ p: 4 }}>
          {/* Wordmark */}
          <Box sx={{ mb: 3 }}>
            <Box component="h1" aria-label="PulseDesk Trader" sx={{ m: 0, mb: 1 }}>
              <BrandWordmark size="lg" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Professional-grade order execution platform
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {sessionExpired && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Your session expired. Please sign in again.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} role="alert">
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Sign in">
            <TextField
              {...register('username', { required: 'Username is required' })}
              label="Username"
              fullWidth
              autoComplete="username"
              autoFocus
              error={!!errors.username}
              helperText={errors.username?.message}
              sx={{ mb: 2 }}
              inputProps={{ 'aria-label': 'Username' }}
            />
            <TextField
              {...register('password', { required: 'Password is required' })}
              label="Password"
              type="password"
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 3 }}
              inputProps={{ 'aria-label': 'Password' }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={status === 'loading'}
              startIcon={status === 'loading' ? <CircularProgress size={15} color="inherit" /> : null}
              sx={{ height: 48, fontWeight: 700, letterSpacing: '0.04em' }}
            >
              {status === 'loading' ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
