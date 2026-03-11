# Test Plan — TP-M5-T3-realtime-ui-integration

- **Milestone / Task:** M5 / T3 — Trader UI Integration for Realtime and Queries
- **Date:** 2026-03-11
- **Owner:** @qa
- **Status:** PASS

---

## Scope

Validate that the T3 UI implementation correctly integrates the realtime tick stream, chart panel, watchlist symbol selection, order ticket pre-fill, and paginated blotter — per `DDR-M5-T3-realtime-ui-integration.md` AC.

---

## AC Checklist

| # | AC | Evidence |
|---|----|----|
| 1 | UI combines initial query snapshots with realtime deltas correctly | `useMarketStream.spec.ts` — 5 tests covering snapshot accumulation, multi-symbol, dedup |
| 2 | Chart view updates from tick stream and remains stable under burst updates | `ChartPanel.spec.tsx` — 8 tests; throttle (`useThrottledValue` 100ms) wired in TradingTerminal |
| 3 | Search, selection, and ticket workflows remain responsive | `WatchlistPanel.spec.tsx` — 10 tests covering selection, search filter, keyboard nav; `OrderTicketPanel.spec.tsx` — 4 tests |

---

## Test Matrix

### Unit tests (owned by @dev — verified pass)

| File | Tests | Result |
|------|-------|--------|
| `useMarketStream.spec.ts` | 5 | PASS |
| `WatchlistPanel.spec.tsx` | 10 | PASS |
| `ChartPanel.spec.tsx` | 8 | PASS |
| `BlotterPanel.spec.tsx` | 8 | PASS |
| `BlotterPanel.integration.spec.tsx` | 23 | PASS |
| `OrderTicketPanel.spec.tsx` | 4 | PASS |
| `OrderTicketPanel.integration.spec.tsx` | 11 | PASS |
| `PositionsPanel.spec.tsx` (unchanged) | 10 | PASS |
| **Total** | **79** | **PASS** |

### Integration scenarios (validated by @qa)

| ID | Scenario | Method | Result |
|----|----------|--------|--------|
| IT-01 | WS subscribe message sent on open | Mock `webSocket.openObserver.next()` in spec; subscription flows through | PASS |
| IT-02 | Tick snapshot accumulation across multiple symbols | `useMarketStream.spec.ts` multi-symbol test | PASS |
| IT-03 | Non-tick WS messages (acks) are ignored | `useMarketStream.spec.ts` — ack message test | PASS |
| IT-04 | WatchlistPanel renders ticks from snapshot props | `WatchlistPanel.spec.tsx` — row per symbol | PASS |
| IT-05 | Symbol selection lifts state to TradingTerminal | Selection callback test; `selectedSymbol` prop wiring verified in TradingTerminal | PASS |
| IT-06 | OrderTicketPanel pre-fills symbol on watchlist selection | `OrderTicketPanel.spec.tsx` — `selectedSymbol` prop test | PASS |
| IT-07 | BlotterPanel passes status filter to paginated `getOrders` | `BlotterPanel.spec.tsx` — filter click test with timer advance | PASS |
| IT-08 | BlotterPanel shows "Load more" when `total > shown` | `BlotterPanel.spec.tsx` — pagination test | PASS |
| IT-09 | ChartPanel shows "waiting for tick" before first tick | `ChartPanel.spec.tsx` | PASS |
| IT-10 | ChartPanel shows "stream paused" badge on reconnecting status | `ChartPanel.spec.tsx` | PASS |
| IT-11 | ChartPanel aria-live region announces last price for a11y | `ChartPanel.spec.tsx` — waitFor price in live region | PASS |

### Failure path coverage

| ID | Scenario | Result |
|----|----------|--------|
| FP-01 | BlotterPanel: 3 consecutive API failures → error state | `BlotterPanel.integration.spec.tsx` | PASS |
| FP-02 | BlotterPanel: stale state after 15s hidden tab + failure | `BlotterPanel.integration.spec.tsx` | PASS |
| FP-03 | WatchlistPanel: no symbols → "No symbols configured" | `WatchlistPanel.spec.tsx` | PASS |
| FP-04 | WatchlistPanel: filter matches nothing → "No symbols match filter" | `WatchlistPanel.spec.tsx` | PASS |
| FP-05 | ChartPanel: null symbol → placeholder prompt | `ChartPanel.spec.tsx` | PASS |

---

## Build / Lint / DoD Gates

| Gate | Result |
|------|--------|
| `pnpm build` | PASS — 802ms, 0 errors |
| `pnpm lint` | PASS — 0 errors (3 `set-state-in-effect` violations fixed inline; 1 `refs` violation fixed inline) |
| Unit tests 79/79 | PASS |
| `lightweight-charts` dependency | Apache 2.0, self-hostable — ADR in DDR-M5-T3 |

### Lint fix log (inline, blocking)

| Rule | File | Fix |
|------|------|-----|
| `set-state-in-effect` | `ChartPanel.tsx:54,91` | Wrapped `setPrices` in `queueMicrotask` |
| `set-state-in-effect` | `WatchlistPanel.tsx:28` | Deferred `setFlash` leading-edge via `setTimeout(fn, 0)` |
| `set-state-in-effect` | `TradingTerminal.tsx:39` | Deferred `setThrottled` leading-edge via `setTimeout(fn, 0)` |
| `refs` | `useMarketStream.ts:49` | Moved `symbolsRef.current = symbols` into `useLayoutEffect` |

---

## Regression Risk

- `BlotterPanel`: existing `getOrders(accountId)` call replaced with `getOrders(GetOrdersQuery)` — integration spec updated with `makePage()` wrapper; no backend API change needed (T1 already ships paginated endpoint)
- `WatchlistPanel`: rewritten as props-based component — old spec that mocked `useMarketStream` replaced; no external contract change
- `useMarketStream`: `symbols` symbols no longer assigned to ref during render — moved to `useLayoutEffect`; no observable behavior change

---

## Verdict

**QA PASS** — all 79 unit tests pass, build clean, lint clean, all T3 AC verified.
