import { Suspense, lazy } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import {
  AppBar,
  Box,
  CircularProgress,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ScienceIcon from '@mui/icons-material/Science';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import { logout } from '../store/authSlice';
import { toggleTheme } from '../store/themeSlice';
import { use401Interceptor } from '../hooks/use401Interceptor';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from '../pages/NotFoundPage';

const TradingTerminalPage = lazy(() => import('tradingMfe/TradingTerminalPage'));
const PortfolioPage        = lazy(() => import('portfolioMfe/PortfolioPage'));
const OrdersPage           = lazy(() => import('ordersMfe/OrdersPage'));
const SimulatorPage        = lazy(() => import('simulatorMfe/SimulatorPage'));

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
      <CircularProgress size={28} />
    </Box>
  );
}

const NAV_LINKS = [
  { to: '/trading',   label: 'Terminal',  Icon: ShowChartIcon },
  { to: '/portfolio', label: 'Portfolio', Icon: AccountBalanceWalletIcon },
  { to: '/orders',    label: 'Orders',    Icon: ReceiptLongIcon },
  { to: '/simulator', label: 'Simulator', Icon: ScienceIcon },
];

export default function AppShell() {
  const dispatch    = useDispatch<AppDispatch>();
  const navigate    = useNavigate();
  const username    = useSelector((s: RootState) => s.auth.username);
  const themeMode   = useSelector((s: RootState) => s.theme.mode);
  use401Interceptor();

  const handleLogout      = () => { dispatch(logout()); void navigate('/login'); };
  const handleToggleTheme = () => { dispatch(toggleTheme()); };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      <AppBar position="static" component="header">
        <Toolbar variant="dense" sx={{ gap: 0, minHeight: 48 }}>

          {/* ── Wordmark ── */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mr: 3, flexShrink: 0 }}>
            <Typography
              component="span"
              sx={{ fontSize: '0.9375rem', fontWeight: 400, letterSpacing: '-0.01em', color: 'text.primary' }}
            >
              Pulse
            </Typography>
            <Typography
              component="span"
              sx={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'primary.main' }}
            >
              Desk
            </Typography>
            <Typography
              component="span"
              sx={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.12em', color: 'text.secondary', ml: 0.5 }}
            >
              TRADER
            </Typography>
          </Box>

          {/* ── Nav links ── */}
          <Box component="nav" aria-label="Main navigation" sx={{ display: 'flex', flex: 1 }}>
            {NAV_LINKS.map(({ to, label, Icon }) => (
              <Box
                key={to}
                component={NavLink}
                to={to}
                sx={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            0.75,
                  px:             1.5,
                  height:         48,
                  fontSize:       '0.8125rem',
                  fontWeight:     500,
                  color:          'text.secondary',
                  textDecoration: 'none',
                  borderBottom:   '2px solid transparent',
                  transition:     'color 120ms, border-color 120ms',
                  '&.active': {
                    color:             'primary.main',
                    borderBottomColor: 'primary.main',
                    fontWeight:        600,
                  },
                  '&:hover:not(.active)': {
                    color: 'text.primary',
                  },
                  '&:active': {
                    opacity: 0.72,
                  },
                  '&:focus-visible': {
                    outline:      '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: '-2px',
                    borderRadius: 1,
                  },
                }}
              >
                <Icon sx={{ fontSize: 15, opacity: 0.85 }} />
                {label}
              </Box>
            ))}
          </Box>

          {/* ── Right controls ── */}
          {username && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mr: 1, fontWeight: 500 }}
            >
              {username}
            </Typography>
          )}

          <Tooltip title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton
              aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              size="small"
              onClick={handleToggleTheme}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              {themeMode === 'dark' ? <LightModeIcon sx={{ fontSize: 17 }} /> : <DarkModeIcon sx={{ fontSize: 17 }} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Sign out">
            <IconButton
              aria-label="Log out"
              size="small"
              onClick={handleLogout}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <LogoutIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/trading" element={
            <ProtectedRoute>
              <ErrorBoundary fallback={<RemoteFallback name="Trading Terminal" />}>
                <Suspense fallback={<LoadingFallback />}><TradingTerminalPage /></Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/portfolio" element={
            <ProtectedRoute>
              <ErrorBoundary fallback={<RemoteFallback name="Portfolio" />}>
                <Suspense fallback={<LoadingFallback />}><PortfolioPage /></Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <ErrorBoundary fallback={<RemoteFallback name="Orders" />}>
                <Suspense fallback={<LoadingFallback />}><OrdersPage /></Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/simulator" element={
            <ProtectedRoute>
              <ErrorBoundary fallback={<RemoteFallback name="Simulator" />}>
                <Suspense fallback={<LoadingFallback />}><SimulatorPage /></Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </Box>
  );
}
