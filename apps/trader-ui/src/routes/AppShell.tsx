import { Suspense, lazy } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import {
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { logout } from '../store/authSlice';
import { use401Interceptor } from '../hooks/use401Interceptor';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from '../pages/NotFoundPage';

const TradingTerminalPage = lazy(() => import('tradingMfe/TradingTerminalPage'));
const PortfolioPage = lazy(() => import('portfolioMfe/PortfolioPage'));
const OrdersPage = lazy(() => import('ordersMfe/OrdersPage'));
const SimulatorPage = lazy(() => import('simulatorMfe/SimulatorPage'));

function RemoteFallback({ name }: { name: string }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography color="error">Failed to load {name}. Please refresh.</Typography>
    </Box>
  );
}

function LoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, p: 4 }}>
      <CircularProgress size={32} />
    </Box>
  );
}

const NAV_LINKS = [
  { to: '/trading', label: 'Terminal' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/orders', label: 'Orders' },
  { to: '/simulator', label: 'Simulator' },
];

export default function AppShell() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const username = useSelector((s: RootState) => s.auth.username);
  use401Interceptor();

  const handleLogout = () => {
    dispatch(logout());
    void navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" component="header">
        <Toolbar variant="dense" sx={{ gap: 2 }}>
          <Typography
            variant="subtitle1"
            component="span"
            sx={{ fontWeight: 700, letterSpacing: '-0.02em', mr: 2 }}
          >
            PulseDesk
          </Typography>
          <Box component="nav" aria-label="Main navigation" sx={{ display: 'flex', gap: 1, flex: 1 }}>
            {NAV_LINKS.map(({ to, label }) => (
              <Box
                key={to}
                component={NavLink}
                to={to}
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'text.secondary',
                  textDecoration: 'none',
                  borderRadius: 1,
                  '&.active': { color: 'text.primary', bgcolor: 'action.selected' },
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
          {username && (
            <Typography variant="caption" color="text.secondary">
              {username}
            </Typography>
          )}
          <IconButton
            aria-label="Log out"
            size="small"
            onClick={handleLogout}
            sx={{ color: 'text.secondary' }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route
            path="/trading"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallback={<RemoteFallback name="Trading Terminal" />}>
                  <Suspense fallback={<LoadingFallback />}>
                    <TradingTerminalPage />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallback={<RemoteFallback name="Portfolio" />}>
                  <Suspense fallback={<LoadingFallback />}>
                    <PortfolioPage />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallback={<RemoteFallback name="Orders" />}>
                  <Suspense fallback={<LoadingFallback />}>
                    <OrdersPage />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulator"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallback={<RemoteFallback name="Simulator" />}>
                  <Suspense fallback={<LoadingFallback />}>
                    <SimulatorPage />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </Box>
  );
}
