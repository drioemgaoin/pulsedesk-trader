# trading-mfe

The **real-time trading terminal** — a Module Federation remote that exposes `TradingTerminalPage`. This is the most latency-sensitive MFE: it maintains a persistent WebSocket connection to the notification service for live market prices and fill events, and coordinates multiple panels in a responsive split layout.

## Role in the System

Consumed exclusively by `trader-ui` at route `/trading`. The host shell lazy-loads this remote and provides all React singletons. This MFE reads the Redux store (owned by the shell) via `useSelector` but does not own the store; it dispatches only to slices defined in `trader-ui` (`setConnectionStatus` in `terminalSlice`).

## Key Features

- **Live price chart** — `ChartPanel` uses Lightweight Charts (TradingView library) to render a real-time candlestick/line chart for the selected symbol. Tick data flows from the WebSocket snapshot, throttled to 100 ms per frame via a custom `useThrottledValue` hook to prevent chart re-rendering on every incoming message.
- **Persistent WebSocket** — `useMarketStream` manages the WebSocket lifecycle with exponential-backoff reconnect logic. Status (`connected` / `reconnecting` / `connecting`) is dispatched to Redux so any MFE can display connection state. The stream receives both market ticks and fill notifications on the same connection.
- **Order Ticket Panel** — 320 px fixed right column. React Hook Form handles BUY/SELL + MARKET/LIMIT form state with field-level validation. The panel syncs the symbol field from `terminal.selectedSymbol` in Redux (set when the user clicks a symbol in the watchlist). An estimated notional value (`qty × price`) is computed inline and shown above the submit button as a sanity check. The panel exposes a `focusSymbol()` imperative handle triggered by the `F2` global keyboard shortcut.
- **Watchlist Panel** — symbol list with live prices from the WebSocket snapshot. Inline on `lg` breakpoints (≥ 1200 px), slides in as a MUI `<Drawer>` on smaller screens. The `/` key focuses the watchlist search (unless an input is already focused). `WatchlistPanel` exposes a `focusSearch()` imperative handle.
- **Blotter Panel** — collapsible bottom panel (37 px header, 240 px open) showing recent fills and open positions via TanStack Query (`useOrdersQuery`, `usePositionsQuery`). Fill events from the WebSocket immediately invalidate the `orders` and `positions` query caches so the blotter reflects fills without polling.
- **Fill toast queue** — `FillEvent` objects received from the WebSocket are queued and shown one at a time in a `<Snackbar>` with a 500 ms gap between each, preventing toast stacking on burst fills.
- **Ticker strip** — single-row header showing the currently selected symbol's last price, bid/ask spread, and WebSocket status indicator.
- **Stale price warning** — if the WebSocket is reconnecting, `OrderTicketPanel` shows an `<Alert>` warning that prices may be stale and marks the estimated notional with `"≈"`.
- **Positions panel** — current holdings with unrealised P&L, colour-coded using `trading.uptick` / `trading.downtick` from the MUI palette (which resolve to `var(--pd-status-up)` / `var(--pd-status-down)` from `tokens.css`).

## Architecture Decisions

**Why `useThrottledValue` for chart ticks:** The WebSocket can deliver multiple ticks per second per symbol. Passing every tick directly to Lightweight Charts' imperative API causes excessive DOM updates. The 100 ms throttle yields 10 updates/second — sufficient for smooth visual feedback without perceptible lag.

**Why imperative refs (`focusSymbol`, `focusSearch`):** Keyboard shortcuts (`F2`, `/`) originate at the `window` level in `TradingTerminalPage` and need to push focus into child panels. Lifting the callback up would require prop-drilling or a Redux action for UI focus (inappropriate). React `forwardRef` + `useImperativeHandle` gives a clean typed interface without coupling panels to the parent's event handling.

**Why fill events invalidate TanStack Query rather than update state directly:** The fill arrives over WebSocket as a partial event. The authoritative positions and order data live on the server. Invalidating the query keys triggers a background refetch that gets the full, accurate state. This avoids building a client-side reconciliation layer for partial order fills.

**Why a single WebSocket connection for both prices and fills:** Opening two connections (one for market data, one for fills) would double the connection overhead per user session. The notification service multiplexes both event types onto one stream, and `useMarketStream` routes them by `type` field in the incoming JSON.

## Running Locally

```bash
# From the monorepo root
pnpm --filter @pulsedesk/trading-mfe dev
# or from this directory
pnpm dev
```

Runs at **http://localhost:5174**. Must be running for the `/trading` route in `trader-ui` to load.

```bash
pnpm build:watch   # Rebuild on change — useful when developing with the host shell
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_STREAM_URL` | `ws://localhost:3016/stream` | WebSocket URL for the notification service |
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL for order submission and positions REST API |

## Connecting to the Rest of the System

- **Upstream:** `trader-ui` host shell provides React, Redux store, MUI `ThemeProvider`, and `QueryClientProvider` as shared singletons.
- **Backend:** submits orders to `execution-service` via the API gateway; reads positions from `portfolio-service`; connects to `notification-service` WebSocket for market ticks and fills.
- **`@pulsedesk/ui`:** all MUI components imported from here, never directly from `@mui/material`.

## Tests

```bash
pnpm test          # vitest single run
pnpm test:watch    # vitest watch mode
```

## Dependencies

### Module Federation — singleton consumers

All packages in this section are listed in `dependencies` but are **not bundled** by this MFE. Each is declared as `singleton: true` in the Vite federation config and resolved at runtime from the copy already loaded by the `trader-ui` shell. Listing them here allows pnpm to resolve types and lets the federation config reference exact version ranges for compatibility checks.

| Package | Why |
|---|---|
| `react` + `react-dom` | Core React runtime. Must be a singleton — two React instances on the same page break hook calls and context propagation. The shell loads React 19 once; this MFE consumes it. |
| `@mui/material` + `@emotion/react` + `@emotion/styled` | MUI component library and its CSS-in-JS engine. Two MUI instances would produce duplicate style injection and theme mismatches (palette tokens would resolve differently in each instance). `singleton: true` guarantees one theme, one emotion cache, one set of generated class names across all MFEs. |
| `@mui/icons-material` | Icon set. Shared singleton so icon components are not duplicated across MFE bundles. |
| `@pulsedesk/ui` | In-house component library. Contains the MUI theme factory, design tokens, and all trading-specific molecules. Shared singleton so theme overrides and component patches apply once and consistently to every MFE. |
| `@reduxjs/toolkit` + `react-redux` | RTK and React-Redux bindings for the shell's Redux store. This MFE reads `auth.token`, `terminal.selectedSymbol`, and `terminal.connectionStatus` via `useSelector`, and dispatches `setConnectionStatus` via `useDispatch`. Sharing as a singleton means this MFE operates on the same store instance the shell created — there is no separate store, no prop-drilling across federation boundaries. Chose Redux over Zustand because Redux DevTools provide a cross-MFE action timeline, which is essential for debugging multi-boundary interactions. |
| `@tanstack/react-query` | Server-state management. This MFE uses `useMutation` for order submission and `useQuery` for order and position polling. By sharing the shell's `QueryClient` singleton, fill events received over WebSocket can call `queryClient.invalidateQueries(['orders'])` and the blotter updates without a full page refresh or duplicated cache. Chose React Query over SWR because of its richer mutation API with optimistic updates and its named cache invalidation. |
| `react-router-dom` | Router context from the shell. Used for `useNavigate` and `useLocation` within panel components. Must be the shell's singleton router; creating a second router inside the MFE would break history synchronisation with the NavBar. |

### Charts

| Package | Why |
|---|---|
| `lightweight-charts` | Powers `ChartPanel` — renders tick history as a real-time line chart on a `<canvas>` element via WebGL. Ticks are throttled to 100 ms via `useThrottledValue` before being pushed to the chart's imperative API, preventing layout thrashing on high-frequency streams. Chose over Chart.js and Recharts because those libraries are DOM/SVG-based and cannot maintain 60 fps at the tick rates this MFE receives. Chose over D3 because Lightweight Charts has out-of-the-box financial chart types (candlestick, area) with no custom rendering code. |

### Real-time streaming

| Package | Why |
|---|---|
| `rxjs` | Manages the persistent WebSocket connection to `/stream`. Uses `webSocket()` from `rxjs/webSocket` for the socket itself and `retryWhen` + `timer` for exponential backoff reconnection — no manual `setTimeout` chains or `readyState` polling. Fill events and market ticks arrive on the same connection and are routed by the `type` field in the JSON payload. |

### Forms & validation

| Package | Why |
|---|---|
| `react-hook-form` | Controls the order ticket form (symbol, side, type, quantity, limitPrice). Uses uncontrolled inputs, so the form does not rerender on each keystroke — critical when the surrounding chart and watchlist are also updating at high frequency. The `type` field is watched via RHF's `watch` to conditionally show the `limitPrice` field. Chose over Formik because Formik's controlled model triggers rerenders on every character input. |
| `zod` | Defines the order ticket schema. `zodResolver` connects the schema to RHF; TypeScript infers the form values type directly from the schema, so no separate `interface` is needed. Chose over Yup because Zod's type inference eliminates parallel type declarations and catches schema-type mismatches at compile time. |

### Utilities

| Package | Why |
|---|---|
| `date-fns` | Formats fill timestamps in the blotter and chart axis labels. Tree-shakable — only the `format` and `parseISO` functions are imported. Chose over moment.js (mutable, not tree-shakable, deprecated) and dayjs (weaker TypeScript types, smaller utility surface). |

### Testing

| Package | Why |
|---|---|
| `vitest` + `@vitest/coverage-v8` | Test runner with Vite's transform pipeline. No separate Babel config for TypeScript/JSX. V8-native coverage avoids Istanbul instrumentation overhead. |
| `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` | DOM-based component testing. `user-event` simulates realistic browser interactions for form submission and keyboard shortcut testing. |
| `msw` | Intercepts REST API calls in tests without mocking modules. Allows tests to exercise the full mutation and query pipeline. |
| `jsdom` | Browser DOM simulation for the Vitest test environment. |

### Build & lint

| Package | Why |
|---|---|
| `vite` + `@vitejs/plugin-react` | Build tool. Vite's federation plugin generates `remoteEntry.js` which the shell fetches at route change. `build:watch` mode keeps `remoteEntry.js` up to date during shell development. |
| `@originjs/vite-plugin-federation` | Vite Module Federation plugin. Configures this MFE as a remote that exposes `TradingTerminalPage` and declares the shared singleton list. |
| `typescript` + `@types/react` + `@types/react-dom` + `@types/node` | TypeScript compilation and type declarations. |
| `eslint` + `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-config-prettier` | Lint toolchain. `typescript-eslint` adds type-aware rules; `react-hooks` enforces hook dependency arrays; `react-refresh` ensures components are fast-refresh compatible. |
| `globals` | ESLint global variable definitions for browser and ES environments. |
