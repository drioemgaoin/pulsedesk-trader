# portfolio-mfe

The **portfolio overview remote** — a Module Federation remote that exposes `PortfolioPage`. It gives traders a real-time view of their open positions: unrealised P&L, per-position market prices updated via WebSocket, sparklines for recent price movement, and CSV export.

## Role in the System

Consumed by `trader-ui` at route `/portfolio`. Like all remotes, it reads the Redux store owned by the shell (`auth.token`) but does not own the store. It maintains its own WebSocket connection for live market prices because positions need current prices to compute unrealised P&L accurately.

## Key Features

- **Hero P&L banner** — the top of the page leads with total unrealised P&L in large bold type, colour-coded green/red via `trading.uptick` / `trading.downtick` (MUI palette aliases for CSS custom properties). A trending icon reinforces direction. Supporting stats (open position count, total market value) sit in a row beneath.
- **5-minute rolling P&L chart** — a `PnlChart` built on Lightweight Charts shows total unrealised P&L sampled once per second, pruning data older than 300 seconds. This gives traders a quick read on whether their book is improving or deteriorating without navigating away.
- **Live market prices via WebSocket** — `useMarketStream` connects to the same notification-service stream as `trading-mfe`. Each position row receives the current market price, computing `unrealizedPnl = (marketPrice - averageCost) × quantity` on the client.
- **Tick history sparklines** — `useTickHistory` accumulates a ring buffer of recent ticks per symbol. `PortfolioPositionRow` renders a miniature sparkline (Lightweight Charts area chart) in the "Trend" column so traders can see 5-minute price direction per position at a glance.
- **Sortable, filterable table** — all columns (Symbol, Qty, Avg Cost, Market Price, Mkt Value, Unrealised P&L, % Return) are sortable via `SortableHeader`. A search field filters by symbol client-side. Sorting uses a `sortPositions` utility in `lib/portfolioCalc.ts` which operates on the same array reference to avoid unnecessary copies.
- **CSV export** — `downloadCsv` serialises the currently filtered+sorted position list to a blob download. The button is disabled when the filtered list is empty.
- **Responsive column hiding** — less critical columns (Avg Cost, Market Price, Mkt Value, Trend) hide at smaller breakpoints via MUI's responsive `display` sx property.
- **Skeleton loading state** — while `usePositionsQuery` fetches, three skeleton rows fill the table to prevent layout shift.
- **Empty state** — when the account has no positions, a centred prompt with a "Go to Trading Terminal" button replaces the table entirely, guiding new users.

## Architecture Decisions

**Why a second WebSocket in this MFE rather than re-using the trading terminal's connection:** Module Federation remotes are independently deployable and independently loaded. A user who navigates directly to `/portfolio` without ever visiting `/trading` would have no active stream. Each MFE that needs live prices manages its own connection. The host shell does not act as a stream broker because that would create coupling between routes.

**Why client-side P&L computation rather than server-side:** The server's position record holds average cost and quantity — static data. Current market price changes many times per second. Polling the server for updated P&L at tick frequency is not feasible. Computing `(marketPrice - averageCost) × quantity` on the client from a WebSocket feed costs almost nothing and keeps the server stateless for this calculation.

**Why the 5-minute rolling window uses UTC second timestamps:** Lightweight Charts requires `UTCTimestamp` (integer seconds since epoch) for its time axis. Using second-resolution timestamps also deduplicates rapid consecutive updates naturally — if two state updates fire within the same second, the second write overwrites the first because `time` is the same.

**Why `useTickHistory` is a separate hook:** The same pattern (accumulating a per-symbol ring buffer from a snapshot) could be needed in other MFEs. Isolating it in a hook keeps `PortfolioPage` readable and makes the accumulation logic testable in isolation.

## Running Locally

```bash
# From the monorepo root
pnpm --filter @pulsedesk/portfolio-mfe dev
# or from this directory
pnpm dev
```

Runs at **http://localhost:5175**. Must be running for the `/portfolio` route in `trader-ui` to load.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_STREAM_URL` | `ws://localhost:3016/stream` | WebSocket URL for live market prices |
| `VITE_API_BASE_URL` | `http://localhost:3000` | REST API base URL for positions data |

## Connecting to the Rest of the System

- **Upstream:** `trader-ui` shell provides React, Redux, MUI `ThemeProvider`, and `QueryClientProvider`.
- **Backend:** reads positions from `portfolio-service` via REST (`GET /api/v1/positions`); connects to `notification-service` WebSocket for live prices.
- **`@pulsedesk/contracts`:** `PositionResponseV1` type used for position data shape.
- **`@pulsedesk/ui`:** all MUI components, plus `SearchField` and `SortableHeader` molecules.

## Tests

```bash
pnpm test          # vitest single run
pnpm test:watch    # vitest watch mode
```

## Dependencies

### Module Federation — singleton consumers

All packages in this section are resolved at runtime from the copy loaded by the `trader-ui` shell. They are listed in `dependencies` for type resolution and federation version-range matching, but this MFE does not bundle its own copy. Two copies of any of these packages in the same browser tab would break context propagation, state sharing, or CSS injection.

| Package | Why |
|---|---|
| `react` + `react-dom` | Core React runtime. A singleton is mandatory — two React instances break hook calls and context. |
| `@mui/material` + `@emotion/react` + `@emotion/styled` | MUI component library and Emotion CSS-in-JS engine. Must be shared: two MUI instances produce duplicate style injection and different theme resolution, meaning `trading.uptick` could resolve to a different colour in this MFE than in the shell. |
| `@mui/icons-material` | MUI icon set used for sort indicators, P&L directional icons, and the CSV export button. Shared to avoid duplicating the icon sprite across MFE bundles. |
| `@pulsedesk/ui` | In-house component library. Provides `PnlValue`, `SortableHeader`, `SearchField`, `tableRowSx`, and all MUI atoms with PulseDesk theme overrides applied. Shared singleton so the theme and component patches are applied once. |
| `@reduxjs/toolkit` + `react-redux` | This MFE reads `auth.token` from the shell's Redux store to authenticate REST requests and WebSocket connections. Sharing the singleton means no separate auth provider is needed — the token is available anywhere via `useSelector`. Chose Redux over React Context for cross-MFE auth because Context would require re-mounting a provider inside every remote, which is not possible across federation boundaries. |
| `react-router-dom` | Shell's router context. Used only for `useNavigate` in the "Go to Trading Terminal" empty-state CTA. Must be the shell's singleton to write to the correct history. |

### Data fetching

| Package | Why |
|---|---|
| `@tanstack/react-query` | Fetches positions data via `useQuery` with a 5-second polling interval. Chose polling over a dedicated REST WebSocket for positions because position records change only on fills — infrequent events. Polling every 5 seconds is a good balance between freshness and server load. Uses the shell's shared `QueryClient` so cache entries are visible across MFEs if needed. Chose React Query over SWR because of better TypeScript inference for paginated/polling queries and richer cache invalidation on WebSocket fill events. |

### Charts

| Package | Why |
|---|---|
| `lightweight-charts` | Used in two places: (1) the 5-minute rolling P&L line chart showing total unrealised P&L sampled at 1 Hz, and (2) per-position sparklines (area chart) in the trend column of the position table. Lightweight Charts supports multiple independent chart instances on the same page efficiently, each owning a separate `<canvas>`. Chose over Recharts and Chart.js because those are SVG/DOM-based and cannot maintain smooth rendering when multiple chart instances update simultaneously at tick frequency. |

### Real-time streaming

| Package | Why |
|---|---|
| `rxjs` | Manages this MFE's own WebSocket connection to `/stream` for live market prices. Each MFE maintains its own connection because a user navigating directly to `/portfolio` without visiting `/trading` would have no active stream otherwise — the shell does not act as a stream broker to avoid coupling between routes. `webSocket()` + `retryWhen` + `timer` provide exponential backoff reconnection without manual state machines. |

### Forms & validation

| Package | Why |
|---|---|
| `react-hook-form` | Manages the position table's filter form (symbol search, sort direction). Even for a small filter form, RHF's uncontrolled input model avoids rerenders while the WebSocket-driven position rows are updating at high frequency. Chose over Formik for the same reason as other MFEs: Formik's controlled model triggers rerenders on every keystroke. |
| `zod` | Validates the filter form schema. TypeScript infers the `FilterValues` type directly from the schema, so form field types are always in sync with validation rules. Chose over Yup because Zod is TypeScript-first and requires no parallel type declarations. |

### Utilities

| Package | Why |
|---|---|
| `date-fns` | Formats chart axis timestamps (UTC seconds to readable labels) and the "Last updated" timestamp in the hero banner. Tree-shakable — only `format` and `fromUnixTime` are imported. Chose over moment.js (deprecated, not tree-shakable) and dayjs (weaker TypeScript types). |

### Testing

| Package | Why |
|---|---|
| `vitest` + `@vitest/coverage-v8` | Test runner aligned with Vite's transform pipeline. V8-native coverage. |
| `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` | DOM-based component tests for position table sorting, P&L colour coding, and the empty state. |
| `msw` | Intercepts `GET /api/v1/positions` in tests. Allows testing polling behaviour and skeleton/loading states without a real server. |
| `jsdom` | Browser DOM simulation for the Vitest environment. |

### Build & lint

| Package | Why |
|---|---|
| `vite` + `@vitejs/plugin-react` | Build tool. Generates `remoteEntry.js` and the async chunks the shell loads at the `/portfolio` route. |
| `@originjs/vite-plugin-federation` | Configures this app as a Module Federation remote, exposing `PortfolioPage` and declaring the singleton dependency list. |
| `typescript` + `@types/react` + `@types/react-dom` + `@types/node` | TypeScript compilation and type declarations. |
| `eslint` + `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-config-prettier` | Lint toolchain. Type-aware rules, hook dependency enforcement, and fast-refresh compatibility checks. |
| `globals` | ESLint global variable definitions. |
