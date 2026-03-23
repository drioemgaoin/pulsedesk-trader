# orders-mfe

The **order history and management remote** — a Module Federation remote that exposes `OrdersPage`. It provides a paginated, filterable view of all orders across their full lifecycle, with inline cancel support and CSV export.

## Role in the System

Consumed by `trader-ui` at route `/orders`. It is the read-heavy, lower-frequency sibling to `trading-mfe`: while the trading terminal handles real-time execution, this page handles the audit trail. Pagination is server-side (the order history can be arbitrarily large); column management and row expansion are handled client-side by TanStack Table.

## Key Features

- **Server-side pagination** — `useOrdersQuery` sends `page` and filter parameters to the REST API. `PAGE_SIZE` is fixed; the server returns `pagination.total` which drives MUI's `<TablePagination>` component. Page resets to 0 whenever filters change.
- **Status chip filter bar** — always-visible filter chips (PENDING, ACCEPTED, FILLED, PARTIALLY_FILLED, REJECTED, CANCELLED) allow quick status-based filtering. Chips are togglable: selecting multiple statuses is an OR filter. Clicking a chip updates `filters.statuses` and resets the page.
- **Secondary filters drawer** — a right-side `<Drawer>` (300 px) holds less-commonly-used filters: symbol multi-input, BUY/SELL side toggle, and date range pickers. A badge on the "more filters" icon button counts how many secondary filters are active.
- **Debounced filter execution** — filter state is debounced 300 ms before being passed to `useOrdersQuery`. This prevents a cascade of concurrent requests when the user rapidly clicks multiple status chips.
- **TanStack Table** — `useReactTable` with `getCoreRowModel` and `getExpandedRowModel`. Pagination is manual (`manualPagination: true`) because the server controls the page boundary. Column definitions use `createColumnHelper` for full TypeScript inference on `OrderResponseV1`.
- **Expandable row detail** — every row is keyboard-accessible (`tabIndex={0}`, `Enter`/`Space` to toggle) and expands via MUI `<Collapse>` to show a `RowDetail` panel with full order metadata (idempotency key, fill time, limit price, etc.).
- **Status-coded left border** — pending/accepted orders have a yellow left border, filled orders green, rejected orders red. This gives the table a quick visual triage layer without relying solely on the status chip.
- **Cancel order** — `OrderCancelCell` shows a cancel button only for cancellable statuses. Clicking opens a confirmation dialog; on confirm it fires a `DELETE /api/v1/orders/:id` mutation and invalidates the `orders` query cache.
- **CSV export** — `downloadOrdersCsv` serialises the currently filtered list (not the full dataset — only the loaded page) to a blob download.
- **Responsive column hiding** — Order ID hides below `md`, Type and Qty hide below `sm`, Submitted and Fill Time hide below `lg`. The table remains usable on mobile with just Symbol, Side, Status, and Cancel.
- **Skeleton loading** — five skeleton rows fill the table height during the initial fetch.

## Architecture Decisions

**Why TanStack Table instead of a simple `<Table>` with manual state:** The order table has non-trivial column configuration (custom cell renderers, responsive visibility, expandable rows) and will likely grow. TanStack Table separates the data model (column definitions, row model) from rendering, which means adding a new column or feature does not require restructuring the render tree. The `createColumnHelper` pattern provides compile-time type safety for cell accessors.

**Why server-side pagination instead of loading all orders:** Order history is unbounded. Loading everything into the browser wastes bandwidth, slows initial render, and forces the client to sort/filter a potentially large array. Server-side pagination keeps the response payload small and predictable. The tradeoff is that client-side sort on page-level data would be misleading (it only sorts the current page), so sort columns are not exposed — filtering is the primary navigation mechanism.

**Why debounce filters at 300 ms:** Without debouncing, each status chip click would fire an immediate query. If the user clicks three chips in quick succession, three concurrent requests race to update the UI. The debounce collapses this into one request for the final filter state, eliminating unnecessary server load and preventing React from reconciling stale responses.

**Why `applyClientFilters` in addition to server filters:** The server receives debounced filters. Between the user interaction and the debounced request completing, the already-loaded rows would appear unfiltered. Applying the same filter logic client-side on the raw result provides instant visual feedback while the debounced server request is in flight.

## Running Locally

```bash
# From the monorepo root
pnpm --filter @pulsedesk/orders-mfe dev
# or from this directory
pnpm dev
```

Runs at **http://localhost:5176**. Must be running for the `/orders` route in `trader-ui` to load.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | REST API base URL for order history and cancel |

## Connecting to the Rest of the System

- **Upstream:** `trader-ui` shell provides React, Redux, MUI `ThemeProvider`, and `QueryClientProvider`.
- **Backend:** reads from `order-service` via `GET /api/v1/orders?page=&status=&symbol=&side=&dateFrom=&dateTo=`; cancels via `DELETE /api/v1/orders/:id`.
- **`@pulsedesk/contracts`:** `OrderResponseV1`, `OrderSide`, `OrderStatus`, `OrderType` types.
- **`@pulsedesk/ui`:** `FilterChip`, `StatusChip`, `tableRowSx`, and all MUI atoms.

## Tests

```bash
pnpm test          # vitest single run
pnpm test:watch    # vitest watch mode
```

## Dependencies

### Module Federation — singleton consumers

All packages in this section are resolved at runtime from the `trader-ui` shell. They are listed in `dependencies` for TypeScript type resolution and federation version-range checking, but are never bundled into this MFE's output chunks.

| Package | Why |
|---|---|
| `react` + `react-dom` | Core React runtime. A singleton is mandatory — two React instances break hook calls and context. |
| `@mui/material` + `@emotion/react` + `@emotion/styled` | MUI component library and CSS-in-JS engine. Must be shared: duplicate MUI instances produce duplicate style injection and theme mismatches — the status chip colours (`ORDER_STATUS_COLORS`) would resolve against different theme objects. |
| `@mui/icons-material` | Icon set for the filter drawer toggle, status icons, and CSV export button. Shared to avoid bundling the icon sprite twice. |
| `@pulsedesk/ui` | In-house component library providing `FilterChip`, `StatusChip`, `tableRowSx`, `SideFilter`, and all MUI atoms with PulseDesk overrides. Shared singleton so design-system styling is applied consistently regardless of which MFE rendered the component. |
| `@reduxjs/toolkit` + `react-redux` | Reads `auth.token` from the shell's store for authenticated API calls. Dispatches nothing — this MFE is read-only with respect to global state. Sharing the singleton means no separate auth plumbing inside the remote. |
| `react-router-dom` | Shell's router context. Used for `useSearchParams` to sync filters with the URL, enabling shareable filter links. Must be the shell's singleton router or URL writes would not affect the browser address bar. |

### Table

| Package | Why |
|---|---|
| `@tanstack/react-table` | Headless table library powering the order history table. Provides sorting logic, pagination model, row expansion state (`getExpandedRowModel`), and `createColumnHelper` for fully type-safe column definitions against `OrderResponseV1`. The MFE renders entirely custom MUI-styled cells — TanStack Table controls the data model, not the DOM. Chose over MUI DataGrid because DataGrid is opinionated about its own UI, making deep customisations (status-coded left borders, expandable rows with fill detail panels, custom cell renderers per status) require fighting the component rather than extending it. Chose over a hand-rolled table because TanStack Table handles pagination with `manualPagination: true` (server controls the page boundary) cleanly, without building that logic from scratch. |

### Data fetching

| Package | Why |
|---|---|
| `@tanstack/react-query` | Fetches order pages with `useQuery`. Query keys include all active filters (`['orders', filters]`) so each distinct filter combination is cached separately — navigating back to a previous filter state is an instant cache hit, no refetch required. `useMutation` drives the cancel-order flow with cache invalidation on success. Chose React Query over SWR because SWR's mutation API is limited and does not support structured cache invalidation by query key prefix. |

### Forms & validation

| Package | Why |
|---|---|
| `react-hook-form` | Manages the secondary filters drawer form (symbol multi-input, side toggle, date range). Filter state lives in RHF; on debounced change the validated values update the query key. RHF's `watch` drives the active-filter badge count on the drawer toggle button. Chose over Formik because Formik rerenders on every field change, and the filter form can update while the table is also re-rendering on query completion. |
| `zod` | Validates the filter schema before the query key updates, preventing malformed date ranges or empty symbol strings from triggering API calls. TypeScript infers the `FilterValues` type directly from the schema. Chose over Yup because Zod's type inference eliminates parallel type declarations. |

### Charts

| Package | Why |
|---|---|
| `lightweight-charts` | Listed as a direct dependency to satisfy the shell's Module Federation singleton contract — every app in the federation must declare the same set of shared dependencies so the host can negotiate a single version. This MFE does not render charts directly; the dependency exists purely for federation compatibility. |

### Real-time streaming

| Package | Why |
|---|---|
| `rxjs` | Listed as a direct dependency for Module Federation singleton compatibility (same rationale as `lightweight-charts`). This MFE has no WebSocket connection; order status updates arrive via React Query cache invalidation triggered by fill events in `trading-mfe`. |

### Utilities

| Package | Why |
|---|---|
| `date-fns` | Formats order submission timestamps, fill times, and the date range picker display values in the filter drawer. Tree-shakable. Chose over moment.js (deprecated, not tree-shakable) and dayjs (weaker TypeScript types for date range arithmetic). |

### Testing

| Package | Why |
|---|---|
| `vitest` + `@vitest/coverage-v8` | Test runner with Vite transform pipeline and V8-native coverage. |
| `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` | Component tests covering row expansion, status chip filter toggling, debounce behaviour, and the cancel confirmation flow. |
| `msw` | Intercepts `GET /api/v1/orders` and `DELETE /api/v1/orders/:id` in tests. Allows testing pagination, filter debouncing, and optimistic cancel without a real server. |
| `jsdom` | Browser DOM simulation for the Vitest environment. |

### Build & lint

| Package | Why |
|---|---|
| `vite` + `@vitejs/plugin-react` | Build tool. Produces `remoteEntry.js` and async chunks the shell loads at the `/orders` route. |
| `@originjs/vite-plugin-federation` | Configures this app as a Module Federation remote, exposing `OrdersPage` and declaring the singleton list. |
| `typescript` + `@types/react` + `@types/react-dom` + `@types/node` | TypeScript compilation and type declarations. |
| `eslint` + `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-config-prettier` | Lint toolchain. Type-aware rules catch accidental `any` in column definitions; hook rules enforce correct `useEffect` dependencies for the debounce timer. |
| `globals` | ESLint global variable definitions. |
