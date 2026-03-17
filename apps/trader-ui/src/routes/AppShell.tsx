import { Suspense, lazy } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import {
  Box,
  CircularProgress,
  Typography,
  NavBar,
  ShowChartIcon,
  AccountBalanceWalletIcon,
  ReceiptLongIcon,
  // ScienceIcon,
} from "@pulsedesk/ui";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { toggleTheme } from "../store/themeSlice";
import { use401Interceptor } from "../hooks/use401Interceptor";
import ProtectedRoute from "./ProtectedRoute";
import NotFoundPage from "../pages/NotFoundPage";

const TradingTerminalPage = lazy(
  () => import("tradingMfe/TradingTerminalPage"),
);
const PortfolioPage = lazy(() => import("portfolioMfe/PortfolioPage"));
const OrdersPage = lazy(() => import("ordersMfe/OrdersPage"));
// const SimulatorPage = lazy(() => import("simulatorMfe/SimulatorPage"));

function RemoteFallback({ name }: { name: string }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography color="error">
        Failed to load {name}. Please refresh.
      </Typography>
    </Box>
  );
}

function LoadingFallback() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        p: 4,
      }}
    >
      <CircularProgress size={28} />
    </Box>
  );
}

const ROUTE_LINKS = [
  { to: "/trading", label: "Terminal", icon: ShowChartIcon },
  { to: "/portfolio", label: "Portfolio", icon: AccountBalanceWalletIcon },
  { to: "/orders", label: "Orders", icon: ReceiptLongIcon },
  // { to: "/simulator", label: "Simulator", icon: ScienceIcon },
];

export default function AppShell() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const username = useSelector((s: RootState) => s.auth.username) ?? undefined;
  const themeMode = useSelector((s: RootState) => s.theme.mode);
  use401Interceptor();

  const navLinks = ROUTE_LINKS.map(({ to, label, icon }) => ({
    label,
    icon,
    isActive: location.pathname.startsWith(to),
    onClick: () => void navigate(to),
  }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <NavBar
        navLinks={navLinks}
        username={username}
        themeMode={themeMode}
        onToggleTheme={() => dispatch(toggleTheme())}
        onLogout={() => { dispatch(logout()); void navigate("/login"); }}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Routes>
          <Route
            path="/trading"
            element={
              <ProtectedRoute>
                <ErrorBoundary
                  fallback={<RemoteFallback name="Trading Terminal" />}
                >
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
          {/* <Route path="/simulator" element={
            <ProtectedRoute>
              <ErrorBoundary fallback={<RemoteFallback name="Simulator" />}>
                <Suspense fallback={<LoadingFallback />}><SimulatorPage /></Suspense>
              </ErrorBoundary>
            </ProtectedRoute>
          } /> */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </Box>
  );
}
