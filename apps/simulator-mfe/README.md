# simulator-mfe

The **market-data and order-flow simulator** — a Module Federation remote that exposes `SimulatorPage`. It lets engineers and QA drive the backend under controlled load without external dependencies: configurable traffic profiles, failure scenarios, live throughput stats, and a virtualised log output.

## Role in the System

This remote is currently commented out in `trader-ui`'s `AppShell.tsx` (the route and nav link are present but disabled). It is designed to be re-enabled when the simulator page is needed for testing or demonstration. When active it would be consumed at route `/simulator`.

It communicates directly with the `market-data-service` (or a simulator gateway) to start, pause, stop, and reset order-generation runs. It does not read the trading terminal's Redux state — it is an independent observability tool.

## Key Features

- **Traffic profiles (Burst / Steady / Ramp):** `ConfigPanel` presents a ToggleButtonGroup to select one of three profiles, each with its own set of form fields:
  - *Burst* — fire N orders immediately (1–500).
  - *Steady* — fire orders at a fixed rate (1–50 orders/s) for a configurable duration (10–300 s).
  - *Ramp* — linearly increase from a min rate to a max rate over a given duration.
- **Symbol mix** — checkboxes select which symbols (AAPL, TSLA, MSFT, NVDA, AMZN) orders are distributed across. At least one must be selected.
- **Failure scenarios** — a radio group selects one of Normal / HighVolume / LimitExceeded / DuplicateKeys / InvalidPayload. The scenario is passed to the backend which adjusts how it processes or rejects orders, enabling targeted testing of error-handling paths.
- **Max concurrency slider** — an "Advanced" accordion (collapsed by default) exposes a 1–20 concurrency slider. This controls how many in-flight order requests the simulator fires simultaneously, allowing saturation testing.
- **Rate limit warning** — for Steady profile, if `ratePerSecond × 60 > VITE_RATE_LIMIT_PER_MIN`, an `<Alert>` warns that the configured rate may exceed the gateway's rate limit. The environment variable allows the threshold to be configured per environment.
- **Simulation lifecycle controls** — Start / Pause / Resume / Stop / Reset buttons are shown contextually based on the current `SimulatorStatus` (`idle`, `running`, `paused`, `stopped`). The config form fields disable while a run is active to prevent mid-run parameter changes.
- **Live stats panel** — `LiveStats` shows real-time counters (Submitted, Accepted, Filled, Rejected, Errored), linear progress bars for acceptance/fill/rejection rates, average fill latency, and a colour-coded error breakdown table. Stats update on every response from the simulation loop.
- **Virtualised log output** — `@tanstack/react-virtual` renders only the visible rows of the event log, keeping DOM node count constant regardless of how many thousands of log entries have accumulated during a long run. This is critical for Burst runs with 500 orders that each generate multiple log entries.

## Architecture Decisions

**Why React Hook Form for the configuration panel:** The config form has conditional fields (each profile type shows different inputs), cross-field validation (ramp min rate must be less than max rate), and needs to be locked during active runs. React Hook Form's `Controller`-based approach integrates cleanly with MUI's controlled components and keeps validation logic co-located with each field.

**Why the profile selection is a ToggleButtonGroup rather than a `<Select>`:** The three profiles are not a long list — they are a small, mutually exclusive set of distinct modes. A toggle group makes all options simultaneously visible and communicates mutual exclusivity without requiring the user to open a dropdown. This is the standard pattern for mode selection in trading and analytics tools.

**Why `@tanstack/react-virtual` for the log:** A 500-order burst with status updates generates 1,000+ log entries. Rendering all rows as DOM nodes would cause severe jank as entries accumulate. Virtual rendering keeps the rendered node count at ~20–30 visible rows regardless of total log size, maintaining 60 fps scrolling.

**Why `VITE_RATE_LIMIT_PER_MIN` is an environment variable:** The rate limit is not a UI concern — it is a backend infrastructure constraint that differs between development, staging, and production. Externalising it allows the warning threshold to track the real limit without a code change.

## Running Locally

```bash
# From the monorepo root
pnpm --filter @pulsedesk/simulator-mfe dev
# or from this directory
pnpm dev
```

Runs at **http://localhost:5177**. The route in `trader-ui` must be uncommented in `AppShell.tsx` to access it through the shell.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_RATE_LIMIT_PER_MIN` | `100` | Gateway rate limit threshold; used to display a warning in the config panel |
| `VITE_SIMULATOR_API_URL` | `http://localhost:3000` | Base URL for the simulator control API |

## Connecting to the Rest of the System

- **Upstream:** `trader-ui` shell provides React, Redux, MUI `ThemeProvider`, and `QueryClientProvider` when the route is active.
- **Backend:** sends POST/DELETE requests to `market-data-service` or a simulator gateway to control the run.
- **`@pulsedesk/ui`:** all MUI components including Accordion, Slider, RadioGroup, Checkbox.

## Tests

```bash
pnpm test          # vitest single run
pnpm test:watch    # vitest watch mode
```

## Dependencies

### Module Federation — singleton consumers

All packages below are resolved at runtime from the `trader-ui` shell. They are listed in `dependencies` for TypeScript type resolution and federation version-range negotiation only — this MFE does not bundle its own copies.

| Package | Why |
|---|---|
| `react` + `react-dom` | Core React runtime singleton. Two React instances on the same page break hook calls and context propagation. |
| `@mui/material` + `@emotion/react` + `@emotion/styled` | MUI component library and Emotion CSS-in-JS engine. Must be shared: duplicate instances produce duplicate style injection and conflicting theme resolution. This MFE uses Accordion, Slider, RadioGroup, Checkbox, ToggleButtonGroup, and LinearProgress — all styled by the shell's theme. |
| `@mui/icons-material` | Icon set for lifecycle control buttons and stats indicators. Shared singleton. |
| `@pulsedesk/ui` | In-house component library providing all MUI atoms with PulseDesk theme overrides. Shared singleton so design tokens (colours, spacing) resolve consistently with the rest of the UI. |
| `@reduxjs/toolkit` + `react-redux` | Reads `auth.token` from the shell's Redux store for authenticated simulator API calls. The simulator does not write to global state — simulation lifecycle (`idle`/`running`/`paused`/`stopped`) is local component state because it is not needed by any other MFE. |
| `react-router-dom` | Shell's router context. Available as a singleton but this MFE uses it only passively — no navigation within the simulator page. |

### Virtualisation

| Package | Why |
|---|---|
| `@tanstack/react-virtual` | Virtualises the log output panel. A 500-order burst generates 1,000+ log entries; without virtualisation, rendering a `<div>` per entry accumulates thousands of DOM nodes and causes severe scroll jank. `useVirtualizer` renders only the ~25 visible rows at any scroll position, keeping DOM size constant regardless of log volume. Chose over `react-window` and `react-virtualized` because `@tanstack/react-virtual` is headless (works with any container and item layout), is actively maintained by the TanStack team, and has first-class TypeScript types. `react-window` is in maintenance mode; `react-virtualized` is largely abandoned. |

### Data fetching

| Package | Why |
|---|---|
| `@tanstack/react-query` | `useMutation` drives Start/Pause/Resume/Stop lifecycle calls with optimistic state updates — the button states reflect the new lifecycle immediately before the server confirms. `useQuery` polls the simulation stats endpoint during a run. Using the shell's shared `QueryClient` means no separate provider needed inside the MFE. Chose React Query over SWR because SWR's mutation API cannot express the sequential Start → Pause → Resume → Stop lifecycle with intermediate optimistic states. |

### Forms & validation

| Package | Why |
|---|---|
| `react-hook-form` | Manages the configuration panel: traffic profile toggle, symbol checkboxes, failure scenario radio group, max concurrency slider, and profile-specific numeric inputs. RHF's `Controller` component integrates cleanly with MUI's controlled components (Slider, Checkbox, RadioGroup). Conditional field visibility (different inputs per profile) is handled via `watch('profile')`, which does not cause the full form to rerender. Chose over Formik because Formik rerenders the entire form on every field change; in a panel with a live-updating stats pane in the same view, that overhead is unacceptable. |
| `zod` | Validates the configuration form before a run starts — ensures at least one symbol is selected, ramp min rate is less than max rate, and numeric fields are within allowed ranges. `zodResolver` connects the schema to RHF. The inferred `ConfigFormValues` type is the single source of truth for what gets sent to the simulator API. Chose over Yup because Zod's TypeScript-first inference eliminates parallel type declarations. |

### Real-time observability

| Package | Why |
|---|---|
| `rxjs` | Drives the live stats polling loop. An `Observable` interval fires every 500 ms while the simulation is running; the subscription tears down automatically on component unmount or simulation stop via `takeUntil`. This is cleaner than a `useEffect` with `setInterval` + `clearInterval` because RxJS operators compose cancellation, error handling, and backpressure in one declarative chain. Listed as a shared singleton for Module Federation compatibility with the shell. |

### Charts

| Package | Why |
|---|---|
| `lightweight-charts` | Listed as a direct dependency to satisfy the shell's Module Federation singleton contract — all federation participants must declare the same shared dependency set. The simulator does not render charts; the dependency exists for federation version negotiation only. |

### Utilities

| Package | Why |
|---|---|
| `date-fns` | Formats log entry timestamps in the virtualised log output and the stats panel's run-duration counter. Tree-shakable. Chose over moment.js (deprecated, not tree-shakable) and dayjs (weaker TypeScript types). |

### Testing

| Package | Why |
|---|---|
| `vitest` + `@vitest/coverage-v8` | Test runner with Vite transform pipeline and V8-native coverage. |
| `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` | Component tests for the config form validation, lifecycle button state transitions, and the virtual log scroll behaviour. |
| `msw` | Intercepts simulator control API calls in tests. Allows verifying that Start/Pause/Resume/Stop fire the correct endpoints and that optimistic state updates revert correctly on server error. |
| `jsdom` | Browser DOM simulation for the Vitest environment. |

### Build & lint

| Package | Why |
|---|---|
| `vite` + `@vitejs/plugin-react` | Build tool. Produces `remoteEntry.js` for the shell to load at the `/simulator` route. |
| `@originjs/vite-plugin-federation` | Configures this app as a Module Federation remote, exposing `SimulatorPage` and declaring the singleton list. |
| `typescript` + `@types/react` + `@types/react-dom` + `@types/node` | TypeScript compilation and type declarations. |
| `eslint` + `@eslint/js` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-config-prettier` | Lint toolchain. Type-aware rules catch accidental `any` in stats-counter types; hook rules enforce correct `useEffect` dependency arrays for the RxJS subscription teardown. |
| `globals` | ESLint global variable definitions. |
