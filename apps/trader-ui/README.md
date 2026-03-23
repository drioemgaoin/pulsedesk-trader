# trader-ui

The **Module Federation host shell** for PulseDesk Trader. This app owns the browser runtime: it boots React, mounts Redux, creates the MUI theme, sets up TanStack Query, and lazy-loads each remote MFE on route change. No business-domain UI lives here — it is purely infrastructure.

## Role in the System

Every other frontend app (`trading-mfe`, `portfolio-mfe`, `orders-mfe`, `simulator-mfe`) is a Webpack/Vite remote that exposes a single React component. `trader-ui` is the host that fetches those remote bundles, shares singleton dependencies with them, and renders them inside `<Suspense>` + `<ErrorBoundary>` wrappers. Users only ever load one URL (`http://localhost:5173`); the shell transparently fetches remote code as needed.

## Key Features

- **JWT authentication** — login page posts credentials, stores the JWT in Redux (`auth` slice) and `localStorage`. The API client's `Authorization` header is primed from `localStorage` before the first render so page reloads don't log the user out.
- **Persistent navigation** — `AppShell` renders a top `NavBar` with Terminal, Portfolio, and Orders links. The shell never unmounts between navigations, so the nav bar state is stable.
- **Theme system** — `themeSlice` stores the active mode (`dark` / `light`) in Redux and immediately writes a `data-theme` attribute to `<html>`. CSS custom properties in `tokens.css` update in zero JS rerender time. A `useMemo` inside `ThemedApp` recreates the MUI theme only when the palette mode changes, keeping MUI's internal alpha/disabled calculations correct.
- **Global error boundary** — wraps the entire app. Each remote additionally gets its own `<ErrorBoundary>` so one failing MFE does not crash the shell.
- **401 interceptor** — `use401Interceptor` hook watches API responses and dispatches `logout()` + redirects to `/login` on auth expiry.
- **MSW** — controlled by `VITE_MSW_ENABLED=true`. The service worker starts before `createRoot` so no real network requests escape during development or CI.
- **`remoteHmrPlugin`** — a Vite plugin that watches each MFE's `remoteEntry.js` file and triggers a full-page reload when a remote rebuilds during dev. Without it, stale cached module federation chunks silently serve old code.
- **React 19 + `react-transition-group` compatibility patch** — MUI's `Grow` uses `Transition` from `react-transition-group` v4. React 19 concurrent scheduling can cause `componentDidMount` to fire before `nodeRef.current` is set. A prototype-level guard in `main.tsx` prevents the resulting `TypeError`.

## Architecture Decisions

**Why this app owns all singletons:** Module Federation requires that `react`, `react-dom`, `react-redux`, `@reduxjs/toolkit`, `@tanstack/react-query`, `react-router-dom`, `@mui/material`, and `@pulsedesk/ui` are loaded exactly once. If each remote bundled its own copy, state would not be shared and context would be lost. The host declares these as `singleton: true, requiredVersion: false` in the Vite federation config; remotes consume the versions the host provides.

**Why Redux for auth and theme rather than Context:** Redux DevTools let engineers inspect the exact sequence of auth events across MFE boundaries. Cross-MFE state sharing via Context would require either prop-drilling through federation boundaries (not possible) or duplicating context providers in every remote. With Redux as a singleton, any remote can call `useSelector` and see the host's state immediately.

**Why `data-theme` attribute + CSS custom properties:** Setting the attribute is synchronous and does not cause a React rerender. The browser immediately applies the matching `[data-theme]` block from `tokens.css`. This eliminates the flash-of-wrong-theme on load and makes the theme toggle feel instant even on slow hardware.

## Running Locally

```bash
# From the monorepo root
pnpm --filter @pulsedesk/trader-ui dev
# or from this directory
pnpm dev
```

Runs at **http://localhost:5173**. Remotes must also be running (ports 5174–5177) for their routes to load. The shell degrades gracefully with an error boundary if a remote is not available.

To enable MSW mocking (no backend required):

```bash
VITE_MSW_ENABLED=true pnpm dev
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_MSW_ENABLED` | `false` | Set to `true` to start the MSW service worker and intercept all API calls with fixtures |
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL for the REST API gateway |

## Connecting to the Rest of the System

- Imports `createAppTheme` and `tokens.css` from `@pulsedesk/ui`.
- The `store.ts` defines `RootState` and `AppDispatch` — remotes reference this type via the `ShellState` type alias in their own `types/store.ts` files (they share the runtime store but declare the shape locally to avoid a hard import cycle).
- All shared singletons are declared in `vite.config.ts` under the `federation()` plugin's `shared` object.

## Tests

```bash
pnpm test          # vitest single run
pnpm test:watch    # vitest watch mode
```

Tests use `@testing-library/react`, `jsdom`, and MSW fixtures. Coverage via `@vitest/coverage-v8`.

## Dependencies

### UI framework

| Package | Why |
|---|---|
| `@mui/material` | Component library for the shell chrome (NavBar, dialogs, Tooltips, Autocomplete). Chose MUI over Chakra UI, Radix, and shadcn because it ships every component this app needs out of the box — no mixing libraries from different design systems. Excellent TypeScript types and the `sx` prop make one-off overrides trivial without separate CSS files. |
| `@emotion/react` + `@emotion/styled` | MUI v6's required CSS-in-JS engine. Styles are scoped by default, eliminating CSS class-name collisions across independently deployed MFEs. Chose Emotion over styled-components because MUI v6 uses Emotion internally; mixing engines causes duplicate runtime instances and bloated bundles. |
| `@mui/icons-material` | Icon set aligned with MUI's component API. Declared here as a Module Federation shared singleton so all remotes draw from the same instance. |
| `@fontsource/inter` | Self-hosted Inter for body text. No Google Fonts CDN call — works offline, satisfies GDPR (no cross-origin request), and eliminates the render-blocking cross-origin font request. |
| `@fontsource/jetbrains-mono` | Self-hosted JetBrains Mono for order IDs, prices, and other numeric monospace contexts. Same rationale as `@fontsource/inter`. |
| `@pulsedesk/ui` | In-house component library. Centralises MUI theme overrides, design tokens, trading-specific molecules (`StatusChip`, `TradeSideButton`), and component-level React 19 compatibility patches. All MFEs share one instance via Module Federation `singleton: true`. |

### State management

| Package | Why |
|---|---|
| `@reduxjs/toolkit` | Manages auth state (JWT token, user identity) and theme preference. RTK eliminates Redux boilerplate via `createSlice` and `createAsyncThunk` while enforcing Immer-powered immutable updates. The shell owns the store; remotes consume it through the shared Module Federation singleton. |
| `react-redux` | React bindings for the Redux store (`useSelector`, `useDispatch`). Declared as a singleton here so all MFEs bind to the same store instance rather than each mounting isolated providers. Chose Redux over Zustand because Redux DevTools give a full cross-MFE action timeline, and the explicit action model makes cross-boundary state changes auditable. |

### Data fetching

| Package | Why |
|---|---|
| `@tanstack/react-query` | Server-state management — caches, deduplicates, and automatically refetches API calls. The `QueryClient` is created once in the shell and shared as a singleton so remotes do not create separate caches. Chose React Query over SWR because: (1) first-class mutation API with optimistic updates, (2) richer cache invalidation primitives, (3) React Query DevTools for cache inspection. |

### Routing

| Package | Why |
|---|---|
| `react-router-dom` | Client-side routing. Each remote MFE maps to a top-level route; the shell registers all routes and lazy-loads remote page components via `React.lazy`. Declared as a Module Federation singleton so remotes receive the same router context (history, location) rather than creating a second router. |

### Forms & validation

| Package | Why |
|---|---|
| `react-hook-form` | Manages the login form. Uncontrolled inputs avoid re-rendering the entire form tree on each keystroke, which matters even on a simple two-field form in the shell where any rerender is overhead. `zodResolver` integration is first-class. Chose over Formik because Formik's controlled-input model causes unnecessary rerenders and its Zod integration requires an extra adapter package. |
| `zod` | Runtime schema validation and TypeScript type inference. The inferred type IS the validation schema — no separate interface declaration needed. Used in the login form via `zodResolver` and to validate API response shapes at the boundary. Chose over Yup because Yup requires parallel type declarations; Zod is TypeScript-first by design. |

### Charts

| Package | Why |
|---|---|
| `lightweight-charts` | TradingView's financial chart library, listed here for Module Federation sharing. Hardware-accelerated canvas rendering at 60 fps. Built specifically for financial time-series data (candlestick, OHLC, volume histogram). Chose over Chart.js, Recharts, and Victory because those are general-purpose charting libraries that lack financial chart types and cannot maintain 60 fps at 100 ms tick intervals. |

### Utilities

| Package | Why |
|---|---|
| `date-fns` | Date formatting and arithmetic throughout the shell and remotes. Chose over moment.js because date-fns is tree-shakable (only imported functions are bundled), immutable by design, and has no global locale side effects. Chose over dayjs because date-fns has stronger TypeScript types and a broader function library for interval/range arithmetic. |
| `rxjs` | WebSocket connection management. Declared here as a Module Federation shared singleton so `trading-mfe` and `portfolio-mfe` use the same RxJS instance. Operators like `webSocket`, `retryWhen`, and `timer` provide reconnection with exponential backoff without manual state machines. |
| `react-transition-group` | Required by MUI internally for animated transitions (Grow, Fade, Slide). Declared explicitly here to apply the React 19 compatibility patch: `findDOMNode` was removed in React 19, breaking the `nodeRef`-less usage pattern in v4. The shell patches `Transition.prototype.componentDidMount` to guard against `nodeRef.current === null` at mount time without disabling the `appear` prop. |
| `react-error-boundary` | Wraps both the entire app and each individual remote MFE in an error boundary. One remote crashing does not unmount the shell or other remotes. The `FallbackComponent` shows a user-friendly error with a retry button. React 18+ recommends component-based error boundaries over ad hoc class components, and this library provides a well-tested, hook-friendly implementation. |

### Module Federation

| Package | Why |
|---|---|
| `@originjs/vite-plugin-federation` | Vite plugin that implements Module Federation for the host shell. Configures the `shared` singleton map, generates `remoteEntry.js`, and handles async chunk loading for each MFE route. |

### Testing

| Package | Why |
|---|---|
| `@testing-library/react` | Component testing against the DOM rather than implementation details. The de facto standard for React testing; integrates directly with `jsdom` and MSW. |
| `@testing-library/user-event` | Simulates realistic user interactions (typing, clicking, tab navigation) in tests. More accurate than `fireEvent` for testing form behaviour because it replicates the full browser event sequence. |
| `@testing-library/jest-dom` | Custom DOM matchers (`toBeInTheDocument`, `toHaveValue`, `toBeDisabled`) that produce readable assertion failure messages. |
| `msw` | Mock Service Worker intercepts API calls at the network level in tests. Because MSW intercepts at the network boundary rather than mocking modules, tests exercise the full request/response pipeline including the 401 interceptor. |
| `jsdom` | Simulates a browser DOM environment inside the Vitest test runner. Required for `@testing-library/react`. |
| `vitest` | Test runner. Uses Vite's transform pipeline so TypeScript and JSX work without a separate Babel config. Chose over Jest because Vite projects require no additional configuration; `@vitest/coverage-v8` uses V8's native coverage instead of Istanbul instrumentation. |
| `@vitest/coverage-v8` | Native V8 coverage — faster than Istanbul and requires no instrumentation build step. |
| `playwright` | End-to-end browser testing for auth flows and cross-MFE navigation. Playwright over Cypress because Playwright supports multiple browser engines (Chromium, Firefox, WebKit) and has a cleaner async API. |

### Build & lint

| Package | Why |
|---|---|
| `vite` | Build tool and dev server for the shell. Vite's native ESM dev server provides instant HMR. The `remoteHmrPlugin` custom plugin hooks into Vite's file-watch API to trigger full-page reloads when a remote's `remoteEntry.js` changes during development. |
| `@vitejs/plugin-react` | Vite plugin for React fast refresh and JSX transform. Required to use React with Vite. |
| `typescript` | Strict TypeScript compilation. The shell's `RootState` and `AppDispatch` types are the canonical store types referenced (via local aliases) by all remotes. |
| `eslint` + `@eslint/js` + `typescript-eslint` | Lint rules enforcing consistent patterns across the codebase. `typescript-eslint` adds type-aware rules (e.g. no implicit `any`, exhaustive `switch` checks) that catch bugs at lint time. |
| `eslint-plugin-react-hooks` | Enforces the Rules of Hooks — detects missing `useEffect` dependencies and conditional hook calls. Essential for a codebase that uses custom hooks extensively. |
| `eslint-plugin-react-refresh` | Ensures that component files export only React components, which is required for Vite's fast refresh to work correctly. |
| `eslint-config-prettier` | Disables ESLint formatting rules that conflict with Prettier so both tools can run without fighting each other. |
| `prettier` | Opinionated code formatter. Eliminates formatting debates in code review; runs as a pre-commit check. |
| `globals` | Provides browser/Node global variable definitions for ESLint's `env` configuration. |
| `@types/node` + `@types/react` + `@types/react-dom` | TypeScript type declarations for Node.js APIs (used in Vite config), React, and ReactDOM. |
