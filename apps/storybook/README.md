# storybook

The **component development and documentation environment** for PulseDesk Trader. This Storybook instance covers the full component tree — from individual MUI atom wrappers up to complete page-level compositions — with MSW intercepting network requests so stories work without any running backend.

## Role in the System

Storybook here is not just a UI catalogue. It is the primary environment for developing components in isolation, verifying visual states that are hard to reproduce in the running app (error states, empty states, specific order statuses), and catching regressions before integration. Every component in `@pulsedesk/ui` and every MFE page has at least one story.

## Key Features

- **Full page stories** — `TradingTerminalPage.stories.tsx`, `OrdersPage.stories.tsx`, `PortfolioPage.stories.tsx`, `SimulatorPage.stories.tsx`, and `LoginPage.stories.tsx` render complete page components inside the same provider stack as the real app. This validates layout, responsiveness, and data flow end-to-end without a browser tab and without any backend.
- **MSW integration** — the `msw-storybook-addon` installs a service worker (`storybook-static/mockServiceWorker.js`) that intercepts `fetch` calls at the browser level. Handlers in `src/fixtures/handlers.ts` return realistic fixture data from `src/fixtures/data.ts`. Because MSW operates at the service worker layer, stories and the app share the exact same handler code with no test-specific API shims.
- **`withProviders` decorator** — `src/decorators/withProviders.tsx` wraps every story with Redux `<Provider>`, `ThemeProvider`, `CssBaseline`, `QueryClientProvider`, and `BrowserRouter`. Stories never need to set up their own providers. The Redux store is recreated fresh for each story to prevent state leakage between stories.
- **Theme toggle** — `@storybook/addon-themes` is configured with dark/light variants, matching the `data-theme` attribute mechanism used in production. Switching theme in the toolbar immediately applies the correct `tokens.css` custom properties with no component changes.
- **Pseudo-states addon** — `storybook-addon-pseudo-states` forces `:hover`, `:focus`, `:active`, and `:disabled` CSS states from the Storybook toolbar. This is the only reliable way to screenshot-test interactive states like `FilterChip` hover rings and `TradeSideButton` pressed states.
- **Interaction stories** — `@storybook/addon-interactions` records `@testing-library/user-event` play functions. Stories for `OrdersPage` and `TradingTerminalPage` include `play` functions that simulate user interactions (filling in the order ticket, toggling filters) to catch integration regressions.
- **Atoms and molecules coverage:**
  - *Atoms:* `Alert`, `Badge`, `Button`, `Chip`, `IconButton`, `LiveBadge`, `PulsingChip`, `Skeleton`, `TextField`, `ToggleButton`, `Typography`
  - *Molecules:* `BrandWordmark`, `FilterChip`, `PnlValue`, `RowDetail`, `SearchField`, `SideFilter`, `SortableHeader`, `StatCell`, `StatusChip`, `TradeSideButton`
  - *Organisms:* `NavBar`

## Architecture Decisions

**Why MSW instead of mocking at the module level:** Module-level mocks (`vi.mock`, manual factory functions) break as soon as a component's import tree changes. MSW intercepts at the network level, which is implementation-agnostic. The same handler file (`fixtures/handlers.ts`) can be reused for unit tests via `msw/node` and for Storybook via `msw-storybook-addon` — one source of truth for mock data.

**Why page-level stories:** Component-level stories catch visual regressions in isolation, but they do not catch data-flow bugs: a component that renders correctly in isolation but receives the wrong props from its parent. Page stories cover the parent-child data contract. Combined with MSW, they also validate that the TanStack Query cache keys, response shapes, and component rendering are all aligned.

**Why a separate `withProviders` decorator rather than per-story setup:** Every PulseDesk component eventually touches the Redux store (for theme or auth) or TanStack Query (for server state). Requiring each story to declare its own providers is error-prone and creates drift. The global decorator guarantees a consistent, production-equivalent provider stack for all stories automatically.

**Why a separate Storybook app rather than putting stories alongside source files:** Storybook needs access to components from all five apps and both packages simultaneously. Placing stories next to source files would require each app to depend on Storybook, pulling devDependencies into production bundles or requiring complex hoisting. A dedicated `storybook` workspace package imports from all other packages via `workspace:*` references with no production impact.

## Running Locally

```bash
# From the monorepo root
pnpm --filter @pulsedesk/storybook dev
# or from this directory
pnpm dev
```

Runs at **http://localhost:6006**. No backend or remotes need to be running — MSW handles all network requests.

To initialise the MSW service worker public asset (only needed once after install):

```bash
pnpm prep
# equivalent to: msw init ./public --no-save
```

To build a static Storybook for deployment or CI artifact:

```bash
pnpm build
# output in storybook-static/
```

## Environment Variables

None required. MSW intercepts all API calls.

## Connecting to the Rest of the System

- Imports components directly from `@pulsedesk/trading-mfe`, `@pulsedesk/portfolio-mfe`, `@pulsedesk/orders-mfe`, `@pulsedesk/simulator-mfe`, `@pulsedesk/trader-ui`, and `@pulsedesk/ui` via `workspace:*`.
- `src/mocks/useMarketStream.ts` provides a mock implementation of `useMarketStream` for stories that need live-price simulation without an actual WebSocket.
- `src/fixtures/data.ts` contains shared fixture objects (orders, positions, market ticks) used by both MSW handlers and story `args`.
