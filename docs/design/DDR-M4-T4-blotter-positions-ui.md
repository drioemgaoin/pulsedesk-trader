# Design Decision Record — Blotter and Positions UI

- **DDR ID:** `DDR-M4-T4-blotter-positions-ui`
- **Date:** `2026-03-11`
- **Status:** `accepted`
- **Owner:** `@design`
- **Related milestone/task:** `M4-T4`
- **Supersedes:** `none`
- **Superseded by:** `none`

---

## Context

- **User goal:** A trader wants to monitor their live order activity (blotter) and current portfolio positions with unrealized PnL, all updating automatically without manual refresh.
- **Constraints:** React 19 + Tailwind CSS v4 (no external component library); dark-first design scheme (`#242424` bg); notification-service WebSocket currently only pushes market ticks; order list API (`GET /v1/orders?accountId`) does not yet exist and must be added.
- **Problem:** The current UI is a single WatchlistPanel. T4 requires a full trading terminal layout with an order ticket, live blotter, and positions panel.

---

## Decision

- **Chosen approach:** Single-page trading terminal layout. Four panels arranged in a grid. Blotter and positions use 5-second polling against REST APIs (no WebSocket extension for order events in T4). Order ticket submits via api-gateway REST. Authentication uses a hardcoded demo session (auto-login on mount with stored JWT in memory; no logout UI required for T4).

- **Key interaction states covered:** default / loading / empty / error / disconnected (WebSocket) / stale (poll age > 15s)

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|---|---|---|---|
| Extend notification-service WebSocket to push order/fill events | True real-time, zero poll lag | Requires notification-service Kafka consumers for 2 new topics; significant backend scope added to T4 | Deferred to M5; polling achieves AC ("update without manual refresh") |
| WebSocket-only for positions | Zero-lag PnL | Notification-service not yet wired to portfolio events | Same deferral as above |
| localStorage/sessionStorage for JWT | Persists across refresh | Security risk (XSS); unnecessary for demo | In-memory is sufficient for demo profile |

---

## Consequences

- **Positive:** Full end-to-end trading flow visible in the UI; blotter and positions refresh every 5s without user action; semantic coloring makes status/PnL scannable at a glance.
- **Negative / trade-offs:** 5s poll latency means a fill appears in the blotter up to 5s after execution; not a real-time blotter in the strict sense. Acceptable for demo profile.
- **Accessibility impact:** Status chips and PnL values use color + text label (not color alone). All interactive controls keyboard-reachable. Table rows use `role="row"`, headers use `scope="col"`. Focus ring visible (Tailwind `focus-visible:ring`).
- **Implementation notes for @dev:**
  - A new `GET /v1/orders?accountId=<id>` endpoint is required on order-service + api-gateway proxy. @dev must add this before blotter polling works.
  - JWT auto-login: on app mount, POST `/auth/login` with `{ username: 'trader', password: 'pulsedesk' }` (env-driven via `VITE_DEMO_USERNAME` / `VITE_DEMO_PASSWORD`). Store JWT in React context (memory only). All API calls include `Authorization: Bearer <token>`.
  - Poll interval: 5000ms via `setInterval` in a custom `usePolling(fn, interval)` hook. Cancel on unmount. Back-off to 15s when the tab is hidden (`document.visibilityState === 'hidden'`).
  - Stale indicator: if last successful poll timestamp > 15s ago, show a `⚠ stale` badge on the panel header.

---

## UX Contract

### Feature: Trader Terminal

**User goal:** Submit orders, monitor order status in a live blotter, and track portfolio positions with PnL — all without manual refresh.

---

### Layout hierarchy

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header: "PulseDesk Trader"   Account: trader   ● Connected / ✕ Error │
├──────────────────┬───────────────────────────────────────────────────┤
│  Watchlist       │  Order Ticket                                      │
│  (existing)      │  Symbol · Side · Type · Qty · Limit Price         │
│  real-time WS    │  [BUY / SELL toggle]  [Submit]                    │
├──────────────────┴───────────────────────────────────────────────────┤
│  [Blotter tab]  [Positions tab]                                       │
│  ──────────────────────────────────────────────────────────────────  │
│  Blotter:  Time · Symbol · Side · Type · Qty · Price · Status        │
│  Positions: Symbol · Qty · Avg Cost · Mkt Price · Unreal PnL         │
│  Total PnL row (positions tab footer)                                 │
└──────────────────────────────────────────────────────────────────────┘
```

Panels:
- **Header** (full width): app title, account indicator, WebSocket connection badge
- **Top-left**: WatchlistPanel (existing — no changes)
- **Top-right**: OrderTicketPanel (new)
- **Bottom** (full width, tabbed): BlotterPanel | PositionsPanel

---

### Panels

#### OrderTicketPanel

Fields:
| Field | Control | Validation |
|---|---|---|
| Symbol | Text input, uppercase-normalized | Non-empty, alphanumeric |
| Side | Toggle button: BUY (green) / SELL (red) | Required |
| Type | Toggle button: MARKET / LIMIT | Required |
| Quantity | Number input | Integer > 0 |
| Limit Price | Number input (shown only when Type=LIMIT) | Decimal > 0 |

States:
- **default**: form idle, Submit enabled when valid
- **submitting**: Submit button shows spinner, all fields disabled
- **success**: Brief green flash on the blotter row (optimistic insert), form resets
- **error**: Inline error message below Submit ("Order rejected: {reason}" or "Request failed — try again")
- **risk-rejected**: Status chip `REJECTED` in blotter with rejection reason tooltip

Keyboard path: `Tab` through fields → `Space` to toggle Side/Type → `Enter` to submit.

---

#### BlotterPanel

Columns: `Time` · `Symbol` · `Side` · `Type` · `Qty` · `Limit Price` · `Status`

Data source: `GET /v1/orders?accountId=<id>` polled every 5s. Sorted by `createdAt` descending (newest first). Max 200 rows displayed.

Status chips (text + background color):

| Status | Color |
|---|---|
| PENDING | gray |
| ACCEPTED | blue |
| FILLED | green |
| REJECTED | red |
| CANCELLED | gray/muted |

Side coloring: BUY = `text-green-400`; SELL = `text-red-400`.

States:
- **loading** (first load): skeleton rows (3 rows, shimmer animation)
- **empty**: "No orders yet. Submit your first order using the ticket above."
- **error**: "Failed to load orders. Retrying…" with last-success timestamp
- **stale** (> 15s since last successful poll): `⚠ stale` badge on panel header
- **live**: table with auto-refresh every 5s

---

#### PositionsPanel

Columns: `Symbol` · `Qty` · `Avg Cost` · `Mkt Price` · `Unrealized PnL`

Footer row: `Total Unrealized PnL` (right-aligned, colored).

Data source: `GET /v1/positions/:accountId` polled every 5s.

PnL coloring: positive = `text-green-400`; negative = `text-red-400`; zero = neutral.

Numeric formatting: prices and PnL to 2 decimal places; quantity to integer or 8dp (trim trailing zeros).

States: same as BlotterPanel (loading / empty / error / stale / live).

Empty state: "No positions. Filled orders will appear here."

---

### Semantic color tokens (Tailwind v4)

| Meaning | Token |
|---|---|
| BUY / profit / success | `text-green-400` / `bg-green-900/30` |
| SELL / loss / danger | `text-red-400` / `bg-red-900/30` |
| Neutral / muted | `text-zinc-400` |
| Active / accent | `text-blue-400` / `bg-blue-900/30` |
| Warning / stale | `text-yellow-400` |
| Surface | `bg-zinc-900`, `bg-zinc-800` |
| Border | `border-zinc-700` |

---

### Interaction states (all panels)

| State | Trigger | Visual |
|---|---|---|
| loading | First mount, no data yet | Skeleton shimmer rows |
| live | Data present, poll healthy | Table; subtle pulse dot in header |
| stale | Poll age > 15s | `⚠ stale` badge; last-updated timestamp |
| error | 3 consecutive poll failures | Error banner; retry countdown |
| disconnected | WebSocket closed (watchlist) | `✕ Disconnected` badge; exponential reconnect |
| reconnecting | WS reconnect in progress | `↺ Reconnecting…` badge |

---

### Keyboard path (full flow)

1. App loads → auto-login → account set → polls begin
2. `Tab` to Symbol input → type symbol
3. `Tab` to Side toggle → `Space` BUY/SELL
4. `Tab` to Type toggle → `Space` MARKET/LIMIT
5. `Tab` to Qty input → type quantity
6. (LIMIT only) `Tab` to Limit Price → type price
7. `Tab` to Submit → `Enter` to submit
8. `Tab` to Blotter tab → `Tab` to Positions tab → `Enter` to switch

---

### Accessibility notes

- Status chips: color + text label (never color alone)
- PnL values: color + `aria-label="Unrealized P&L: +1234.56"` on cell
- Tables: `<table>` with `<thead>/<tbody>`, `scope="col"` on `<th>`, `role` implicit from semantics
- Focus ring: `focus-visible:ring-2 focus-visible:ring-blue-500` on all interactive elements
- Reduced-motion: skeleton animations respect `prefers-reduced-motion`
- Contrast: green-400 and red-400 on zinc-900 background pass WCAG AA for text
