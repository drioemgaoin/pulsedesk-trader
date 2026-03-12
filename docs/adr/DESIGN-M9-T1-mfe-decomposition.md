# Design Note — M9-T1: MFE Decomposition, Routing, and State Strategy

- **Task:** M9-T1
- **Date:** 2026-03-12
- **Owner:** @arch
- **Status:** DESIGNED

---

## Task

```
Task: M9-T1
Components impacted:
  - apps/trader-ui (shell — restructured as MFE host)
  - apps/trading-mfe (new remote — trading terminal page)
  - apps/portfolio-mfe (new remote — portfolio page)
  - apps/orders-mfe (new remote — orders management page)
  - apps/simulator-mfe (new remote — load simulator page)
  - notification-service (T7 adds Kafka consumer; not in scope for T1 but noted)
Stack compliance: ADR required → see ADR-M9-T1-module-federation.md + ADR-M9-T1-frontend-stack.md
Proposed approach:
  - See sections below
Risks and mitigations:
  - See "Risks" section below
Recommendation: PROCEED
```

---

## 1. Decomposition Contract

### 1.1 Shell — `apps/trader-ui`

**Role:** Host app. Owns routing, auth guard, global providers, and navigation shell. Exposes nothing. Consumes all four remotes.

**Responsibility boundary:**
- React Router v7 `BrowserRouter` with all route definitions
- Redux Toolkit store: `authSlice` (token, username, status) + `terminalSlice` (selectedSymbol)
- TanStack `QueryClient` instance (shared singleton to all remotes via context)
- MUI v6 `ThemeProvider` + `CssBaseline` (dark theme, brand tokens from T2)
- `AppShell` layout: `MUI AppBar` (tabs, connection status chip, user menu) + `<Outlet />`
- `ProtectedRoute` guard: reads `authSlice.status`; redirects unauthenticated users to `/login`
- Top-level `react-error-boundary` `ErrorBoundary` in `main.tsx` (full-page fallback)
- Per-remote `ErrorBoundary` at each `React.Suspense` lazy-load site (inline fallback card)

**Module Federation role:** `host` in `vite.config.ts`. Consumes:
```
remotes: {
  tradingMfe:   VITE_TRADING_REMOTE_URL + '/assets/remoteEntry.js',
  portfolioMfe: VITE_PORTFOLIO_REMOTE_URL + '/assets/remoteEntry.js',
  ordersMfe:    VITE_ORDERS_REMOTE_URL + '/assets/remoteEntry.js',
  simulatorMfe: VITE_SIMULATOR_REMOTE_URL + '/assets/remoteEntry.js',
}
```
Remote URLs are runtime env vars — shell does not bundle remote code; remotes are dynamic imports at route activation.

---

### 1.2 Trading Remote — `apps/trading-mfe`

**Exposes:** `TradingTerminalPage` (one root component).

**Owns:**
- `WatchlistPanel`, `ChartPanel`, `OrderTicketPanel`, `BlotterPanel`, `PositionsPanel`
- `useMarketStream` — RxJS WebSocket subscription to notification-service; `BehaviorSubject` per symbol
- `useFillStream` — handles `order.filled` WebSocket messages (T7); emits to `MUI Snackbar`
- TanStack Query hooks: `useWatchlistQuery`, `useOrdersQuery`, `usePositionsQuery`, `useSubmitOrderMutation`

**Reads from shell singletons:**
- Redux `terminalSlice.selectedSymbol` (r/w — watchlist row click dispatches `setSelectedSymbol`)
- Redux `authSlice.token` (read — injected into `apiClient` `Authorization` header)
- `QueryClient` (write — invalidates `['orders']` and `['positions']` on fill and mutation success)

**Does not own:** auth state, routing, theme.

---

### 1.3 Portfolio Remote — `apps/portfolio-mfe`

**Exposes:** `PortfolioPage`.

**Owns:**
- Account summary header (computed from positions query)
- Positions table (MUI Table, client-side sortable)
- Sparklines per symbol (`useTickHistory` buffers last 60 ticks from a shared RxJS stream reference)
- Aggregate PnL area chart (Lightweight Charts)

**Reads from shell singletons:**
- Redux `authSlice.token`
- `QueryClient` — `usePositionsQuery` with `refetchInterval: 5_000`

**Does not own:** market stream (tick data comes from a tick-buffer hook that taps the stream produced in trading-mfe).

> **Cross-remote stream concern:** Portfolio needs per-symbol tick history for sparklines. The RxJS `BehaviorSubject` is owned by trading-mfe and cannot be shared directly across Module Federation boundaries without an explicit shared module. Resolution: portfolio-mfe opens its own lightweight WebSocket connection for tick buffering — it does not render the live chart but only buffers last-60-ticks for sparklines. This keeps remotes decoupled. Alternatively, `useTickHistory` can be a small shared utility in `packages/contracts/` that manages its own WS subscription. @dev to decide in T6/T8 based on implementation complexity — documented here as an open design question.

---

### 1.4 Orders Remote — `apps/orders-mfe`

**Exposes:** `OrdersPage`.

**Owns:**
- TanStack Table v8 `useReactTable` instance (server-side pagination + column definitions)
- Filter state (`useState` — page, statusFilter, symbolFilter, sideFilter, dateRange)
- `useCancelOrderMutation` — optimistic update + rollback

**Reads from shell singletons:**
- Redux `authSlice.token`
- `QueryClient` — `useOrdersQuery` keyed on `['orders', { page, filters }]`

---

### 1.5 Simulator Remote — `apps/simulator-mfe`

**Exposes:** `SimulatorPage`.

**Owns:**
- Traffic profile config form (React Hook Form + Zod)
- Traffic generator logic (semaphore + rate limiter, profile-specific generators)
- Live stats accumulation (counters, rolling latency mean)
- TanStack Virtual v3 `useVirtualizer` for the live feed (last 500 entries)

**Reads from shell singletons:**
- Redux `authSlice.token`
- No `QueryClient` queries — simulator issues fire-and-forget `POST /api/v1/orders` calls directly via `apiClient` (mutation rate is too high for TanStack Query mutation overhead; tracked internally)

---

## 2. State Ownership Summary

| State category | Owner | Mechanism | Cross-remote access |
|----------------|-------|-----------|---------------------|
| Auth token + user identity | Shell | Redux `authSlice` | Via MFE singleton — `useSelector` in any remote |
| Selected symbol | Shell | Redux `terminalSlice` | Via MFE singleton — trading-mfe dispatches; others read-only |
| Server cache (REST responses) | Shell (QueryClient) | TanStack Query | Via MFE singleton context — all remotes call `useQueryClient()` |
| WebSocket market stream | trading-mfe | RxJS `BehaviorSubject` | Not shared — portfolio-mfe opens own WS for tick buffering |
| WebSocket fill events | trading-mfe | `useFillStream` / RxJS `Subject` | Not shared — fill events only relevant in terminal page |
| Form state | Per remote | React Hook Form | Component-local |
| UI toggles, pagination, filter state | Per remote | React `useState` | Component-local |
| Simulator traffic state | simulator-mfe | React `useRef` + `useState` | Component-local |

---

## 3. Module Federation Singleton Package Contract

Every `vite.config.ts` across all five apps **must** declare these packages as `{ singleton: true, requiredVersion: "..." }`. A version mismatch silently loads two React instances and causes Hooks invariant violations.

```ts
shared: {
  react:                   { singleton: true, requiredVersion: '^19.0.0' },
  'react-dom':             { singleton: true, requiredVersion: '^19.0.0' },
  'react-router-dom':      { singleton: true, requiredVersion: '^7.0.0' },
  '@reduxjs/toolkit':      { singleton: true, requiredVersion: '^2.0.0' },
  'react-redux':           { singleton: true, requiredVersion: '^9.0.0' },
  '@tanstack/react-query': { singleton: true, requiredVersion: '^5.0.0' },
  '@mui/material':         { singleton: true, requiredVersion: '^6.0.0' },
  '@emotion/react':        { singleton: true, requiredVersion: '^11.0.0' },
  '@emotion/styled':       { singleton: true, requiredVersion: '^11.0.0' },
}
```

Packages **not** singletons (each remote bundles its own copy):
- `@tanstack/react-table`, `@tanstack/react-virtual` — headless logic, no context, no DOM conflict
- `lightweight-charts` — canvas-based, self-contained
- `react-hook-form`, `zod` — no context required
- `date-fns` — pure functions

---

## 4. Routing Architecture

```
/login          → LoginPage          (public — no ProtectedRoute)
/terminal       → TradingTerminalPage  (lazy remote: tradingMfe)
/portfolio      → PortfolioPage        (lazy remote: portfolioMfe)
/orders         → OrdersPage           (lazy remote: ordersMfe)
/simulator      → SimulatorPage        (lazy remote: simulatorMfe)
*               → NotFoundPage         (ProtectedRoute — unauthenticated → /login)
```

Default authenticated redirect: `/` → `/terminal`.

Each protected route pattern:
```tsx
<Route
  path="/terminal"
  element={
    <ProtectedRoute>
      <React.Suspense fallback={<TerminalSkeleton />}>
        <ErrorBoundary fallback={<RemoteErrorCard name="Terminal" />}>
          <TradingTerminalPage />  {/* lazy remote import */}
        </ErrorBoundary>
      </React.Suspense>
    </ProtectedRoute>
  }
/>
```

---

## 5. Clean Architecture Layering

```
apps/
  trader-ui/src/
    providers/        → ThemeProvider, QueryClientProvider, ReduxProvider, RouterProvider
    routes/           → route definitions, ProtectedRoute, AppShell
    store/            → authSlice, terminalSlice, store.ts
    hooks/            → useDocumentTitle, use401Interceptor
    components/       → shared UI primitives (RemoteErrorCard, AppSkeleton)
    mocks/            → MSW handlers, server.ts, browser.ts
    theme/            → theme.ts (MUI custom dark theme)

  trading-mfe/src/
    features/
      terminal/ui/    → TradingTerminalPage, panel components
      terminal/hooks/ → useMarketStream, useFillStream, TanStack Query hooks
      terminal/api/   → typed fetch wrappers
      terminal/types/ → local TypeScript types
```

**Dependency direction rule:** UI components → hooks → api → types. No upward imports. No component imports from another feature. No direct `fetch` in components.

---

## 6. Reliability Implications

- **Remote loading failure:** `react-error-boundary` at each lazy-load site catches `Promise` rejections from `dynamic import()`. Shell and other routes remain functional. User sees an inline error card with "Retry" button that re-triggers the import.
- **Auth token expiry:** `use401Interceptor` wraps global `fetch` — any 401 from any remote's API call triggers logout + redirect. TanStack Query `onError` also checks for 401 `ApiError`.
- **WebSocket disconnect:** `useMarketStream` uses RxJS `webSocket()` with `reconnectOnError: true`; exponential backoff max 30s; disconnected state emits a `connectionStatus$` observable that UI components read for degraded-mode display (T3 UX contract).
- **Tab close / navigation:** `useMarketStream` cleanup in `useEffect` return — `subscription.unsubscribe()` closes the WS connection on unmount. No open handles.
- **QueryClient on logout:** `queryClient.clear()` on logout — no stale data from previous session accessible after re-login.

---

## 7. Security Implications

- JWT token lives in Redux in-memory state only — not `localStorage`, not `sessionStorage`. Tab reload clears the token; dev-only auto-login via `VITE_DEMO_*` env vars is guarded by `import.meta.env.DEV`.
- All remotes receive token via the shared Redux singleton — no token passed via props, URL params, or postMessage.
- CORS: in production, all five apps are served from the same NGINX origin. No cross-origin `remoteEntry.js` URLs. Dynamic `import()` — no `eval` — no CSP relaxation required.
- IDOR: fill notifications filtered by `accountId` both server-side (gateway + notification-service) and client-side (T7 frontend guard).

---

## 8. Observability Implications

- TanStack Query Devtools rendered only in `import.meta.env.DEV` — zero production overhead.
- QueryClient global `onError` handler logs query key + error details via `console.error` in dev; in production this hook can be wired to an error reporting service (post-M9 enhancement, not in scope).
- No frontend OpenTelemetry tracing in M9 scope — would require `@opentelemetry/sdk-trace-web` ADR. Grafana dashboards observe backend service metrics during simulator runs (T9/T10 observability links panel).

---

## 9. Risks and Mitigations

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|-----------|
| MFE singleton version mismatch causes multiple React instances | Medium | High | pnpm workspace exact version pinning + CI build matrix validates all 5 apps compile together |
| `vite-plugin-federation` dev vs prod behaviour divergence | Medium | High | CI runs `pnpm build` for all 5 apps; smoke test verifies `remoteEntry.js` loads in NGINX container |
| Portfolio sparklines require a second WS connection (battery/bandwidth) | Low | Low | Acceptable for a demo platform; post-M9 can share stream via `packages/contracts/` shared module |
| Redux store not truly singleton if MFE config missing `singleton: true` | Low | High | Enforced via code review checklist; unit test that asserts all remotes access same store instance |
| QueryClient not shared — each remote creates its own instance, causing stale cross-page caches | Low | Medium | Shell provides QueryClient via singleton context; remotes call `useQueryClient()` — never instantiate their own |

---

## 10. Local Dev Workflow

```
# Start all five Vite dev servers:
pnpm --filter apps/trading-mfe dev     # port 5174
pnpm --filter apps/portfolio-mfe dev   # port 5175
pnpm --filter apps/orders-mfe dev      # port 5176
pnpm --filter apps/simulator-mfe dev   # port 5177
pnpm --filter apps/trader-ui dev       # port 5173 (shell — start last)
```

Shell resolves remotes from `VITE_*` env vars set in `.env.local` (defaults to localhost ports above).

---

## 11. Open Questions

1. **Portfolio sparkline WS strategy:** own WS connection vs shared `packages/contracts/` stream utility — defer to @dev in T6/T8.
2. **Build order in CI:** remotes must be built before shell (shell references `remoteEntry.js` at build time in some federation configs). Confirm with @devops in T4 whether runtime-only remote loading is used (removes build-time order dependency).
3. **pnpm workspace package names:** confirm `apps/trading-mfe`, `apps/portfolio-mfe` etc. are correct names matching `package.json` `"name"` fields @dev creates in T5.
