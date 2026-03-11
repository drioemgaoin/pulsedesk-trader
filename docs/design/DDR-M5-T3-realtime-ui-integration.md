# DDR-M5-T3 — Trader UI Integration for Realtime and Queries

- **DDR ID:** `DDR-M5-T3-realtime-ui-integration`
- **Date:** 2026-03-11
- **Status:** approved
- **Owner:** @design
- **Related milestone/task:** M5-T3

---

## Context

After T2, the notification service requires clients to send a `subscribe` message before receiving any market ticks. The current `useMarketStream` hook sends no such message and will receive nothing. T3 must:

1. Fix the subscription protocol in `useMarketStream`
2. Add a chart panel driven by the tick stream (T3 AC: "Chart view updates from tick stream")
3. Wire the Blotter to the paginated orders API (T1 output)
4. Define precise UX states for connection lifecycle and degraded modes

---

## Layout Decision

**Current:** `[Watchlist 35%] | [Ticket 65%]` top row, tabbed blotter/positions bottom row.

**Updated:** `[Watchlist 22%] | [Chart 43%] | [Ticket 35%]` top row. Chart panel activates on symbol selection in watchlist; shows a "Select a symbol" placeholder otherwise.

**Rationale:** Standard trading terminal pattern. Chart is persistent — not modal — so traders can watch price action while composing an order in the ticket. Watchlist narrows to 22% to accommodate the chart without pushing the ticket off-screen.

---

## Feature Contracts

### 1 — WS Connection State Machine

**User goal:** Always know whether market data is live, stale, or recovering.

**States:**

| State | Header indicator | Watchlist header |
|-------|-----------------|-----------------|
| `connecting` | amber dot (static) + "Connecting…" | dim text |
| `connected` | green dot (pulse) + "Connected" | normal |
| `disconnected` | red dot (static) + "Disconnected" | "Stream offline" |
| `reconnecting` | amber dot (spin) + "Reconnecting… (Ns)" | "Reconnecting…" |

**Rules:**
- `useMarketStream` exposes `status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'` alongside the snapshot.
- `connected` is set only after receiving the first tick post-subscribe (not merely on socket open).
- `reconnecting` shows elapsed backoff time (e.g. "Reconnecting… 4s").
- `disconnected` is shown only when all retry attempts are exhausted (currently infinite retry — so `disconnected` appears between close and first retry attempt).

---

### 2 — Subscription Protocol (useMarketStream)

**User goal:** Receive all market ticks for watchlist symbols without manual configuration.

**Protocol:**
- On WebSocket open: send `{ event: 'subscribe', data: { symbols: ['*'] } }` (wildcard — all symbols). The server side does not currently implement `*` wildcard; the hook should send a subscribe for all currently known symbols, or re-subscribe after symbol discovery.

**Revised approach (no server-side wildcard needed):**
- On open: send `{ event: 'subscribe', data: { symbols: WATCHLIST_SYMBOLS } }` where `WATCHLIST_SYMBOLS` is a static env-configured list (e.g. `VITE_WATCHLIST_SYMBOLS=AAPL,TSLA,MSFT,NVDA,AMZN`).
- If not configured, subscribe to the first batch of symbols received from the initial REST snapshot (`GET /api/v1/watchlist`) and then maintain the WS stream for deltas.

**Initial snapshot + realtime delta pattern:**
1. On mount: fetch `GET /api/v1/watchlist` → populate snapshot immediately (no WS delay)
2. Open WS → subscribe to the same symbol set
3. On each incoming tick: merge into snapshot (existing reducer pattern)
4. On reconnect: re-send subscribe message (RxJS WebSocket reconnects automatically; subscribe must be re-sent on each open)

**Keyboard path:** N/A (background hook)

---

### 3 — Watchlist Panel

**User goal:** Scan live prices and select a symbol to chart and trade.

**Layout hierarchy:**
- Header bar: panel label + WS status dot + search input (right-aligned)
- Table: Symbol | Bid | Ask | Last | Vol — sortable by Symbol (default asc)
- Selected row: highlighted with `bg-blue-900/20 ring-1 ring-blue-500` inset

**Interaction states:**

| State | Rendering |
|-------|-----------|
| connecting | 3 skeleton rows, "Connecting…" text |
| connected, data present | full table |
| connected, no data | "No symbols. Check VITE_WATCHLIST_SYMBOLS." |
| disconnected / reconnecting | table retains last known data + panel-level amber "⚠ Stream offline" |
| row selected | `bg-blue-900/20 ring-1 ring-blue-500/40 inset` |
| tick update (price changed) | cell flashes: green for up, red for down — 600ms fade via CSS transition |

**Search:** Single text input filters rows by symbol prefix (case-insensitive). Clears on Escape. Does not alter WS subscriptions.

**Symbol selection:** Click or `Enter`/`Space` on a focused row. Selected symbol is lifted to `TradingTerminal` state and passed to ChartPanel and OrderTicketPanel.

**Keyboard path:**
- `Tab` into watchlist → first row focused
- `↑` / `↓` navigate rows
- `Enter` or `Space` selects symbol
- `Escape` clears search if focused, otherwise deselects row

**Accessibility:** `role="grid"`, `aria-selected` on rows, `aria-label` on price cells with direction.

---

### 4 — Chart Panel

**User goal:** See price history for the selected symbol updating in realtime from the tick stream.

**Layout hierarchy:**
- Header: symbol name + current `last` price + Δ from open tick
- Chart body: line chart of `last` price over a rolling 5-minute window (300 data points max at 1s intervals)
- Footer: timestamp of most recent tick

**Data source:** Tick stream only — no separate OHLC endpoint. Chart appends each incoming `last` price with its `timestamp`. No initial historical data.

**Burst stability:** Tick updates are throttled to max 10 renders/second via RxJS `throttleTime(100, asyncScheduler, { leading: true, trailing: true })`. The chart component receives the throttled value, not raw ticks.

**Interaction states:**

| State | Rendering |
|-------|-----------|
| No symbol selected | `"Select a symbol from the watchlist"` placeholder, centered |
| Symbol selected, no data yet | spinner + `"Waiting for first tick…"` |
| Symbol selected, data present | chart with live line |
| Stream disconnected | chart retains last data + amber badge `"Stream paused"` |

**Chart library:** `lightweight-charts` (Lightweight Charts by TradingView). Per ARCHITECTURE.md: "Lightweight Charts preferred, Recharts fallback." Added as a new dependency.

**Accessibility:** Chart is decorative (`aria-hidden`). A live `aria-live="polite"` text region announces the current last price on each throttled update for screen readers.

---

### 5 — Blotter Panel

**User goal:** See all account orders, filterable by status, refreshed frequently.

**Changes from current (polling only):**
- Pagination: show 50 orders by default; "Load more" button (offset-based) when total > limit
- Status filter: segmented control above table — All | Pending | Filled | Cancelled | Rejected
- Filter drives `GET /api/v1/orders?status=&limit=50&offset=` query
- Polling interval remains 5s (no WS-driven updates for orders in T3 — account WS channel is T4)

**Interaction states:**

| State | Rendering |
|-------|-----------|
| loading (initial) | 3 skeleton rows |
| live | table + green pulse dot + "Load more" if total > shown |
| stale (fetch error) | table retains data + ⚠ amber "stale" badge |
| error (no data) | "Failed to load orders. Retrying…" |
| empty | "No orders matching filter." |

**Filter keyboard path:** Segmented buttons are `role="radiogroup"` / `role="radio"` — arrow keys cycle through options.

---

### 6 — Positions Panel

**No layout changes.** Polling remains 5s. Stale/error states are already implemented. No T3 changes required beyond confirming the positions endpoint now correctly derives `accountId` from JWT (T1 fix). Panel is already correct.

---

## State Lift: Selected Symbol

`TradingTerminal` owns `selectedSymbol: string | null` state.

```
TradingTerminal
├── WatchlistPanel  (reads snapshot; fires onSymbolSelect(symbol))
├── ChartPanel      (receives selectedSymbol; reads from same tick stream)
└── OrderTicketPanel (receives selectedSymbol; pre-fills symbol field)
```

`useMarketStream` is called once in `TradingTerminal` and the snapshot is passed down as a prop — avoiding duplicate WS connections from child components.

---

## Updated Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ PulseDesk Trader           [Account: xxx]   ● Connected             │ ← header
├──────────────────┬──────────────────────────┬───────────────────────┤
│ Watchlist  [🔍]  │ TSLA — 200.25  ▲ +1.2%  │  Order Ticket         │
│ ──────────────── │ ─────────────────────── │ ─────────────────────  │
│ AAPL  181  182   │    [lightweight-charts   │  Symbol: [TSLA    ▾]   │
│►TSLA  200  200.5 │     line chart]          │  Side:   [BUY] [SELL] │
│ MSFT  415  416   │                          │  Type:   [MARKET]      │
│ NVDA  880  881   │ Last tick: 13:45:01      │  Qty:    [___]         │
│                  │                          │  [Submit Order]        │
├──────────────────┴──────────────────────────┴───────────────────────┤
│ [Blotter] [Positions]   ● live                                       │
│ All | Pending | Filled | Cancelled | Rejected                        │
│ Time   Symbol  Side  Type  Qty  LimitPx  Status                      │
│ 13:44  TSLA    BUY   MKT   100  —        FILLED                      │
│                                                    [Load more (48)]  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Dependency Addition

| Package | Reason | Self-hostable |
|---------|--------|---------------|
| `lightweight-charts` | Price chart for ChartPanel | ✅ OSS (Apache 2.0) |

---

## Out of Scope for T3

- Account-scoped WS subscriptions (order fill push, position push) — T4
- Historical OHLC data — not available from current services
- Multiple chart windows / detached chart
- Mobile breakpoints
