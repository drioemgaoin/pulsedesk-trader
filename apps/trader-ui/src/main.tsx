import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline, Box, Typography } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { store } from './store/store';
import { theme } from './theme/theme';
import AppShell from './routes/AppShell';
import LoginPage from './pages/LoginPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 300_000,
      retry: 2,
    },
  },
});

async function enableMocking(): Promise<void> {
  if (import.meta.env['VITE_MSW_ENABLED'] !== 'true') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

function RootErrorFallback() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" color="error" gutterBottom>
        Something went wrong
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Please refresh the page.
      </Typography>
    </Box>
  );
}

enableMocking().then(() => {
  const root = document.getElementById('root');
  if (!root) throw new Error('Root element not found');

  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary fallback={<RootErrorFallback />}>
        <Provider store={store}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/*" element={<AppShell />} />
                  <Route path="/" element={<Navigate to="/trading" replace />} />
                </Routes>
              </BrowserRouter>
            </QueryClientProvider>
          </ThemeProvider>
        </Provider>
      </ErrorBoundary>
    </StrictMode>,
  );
});
