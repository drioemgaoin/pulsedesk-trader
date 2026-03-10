# Test Plan — Market Data Service Tick Ingestion and Simulation

- **TP ID:** `TP-M2-T2-market-data-tick-ingestion`
- **Date:** `2026-03-09`
- **Last updated:** `2026-03-09`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** M2-T2
- **Verdict:** `PASS`

---

## Scope

- **In scope:** Tick simulator, `POST /ticks` ingestion, `GET /watchlist`, `GET /metrics`, validation rejection counter, graceful shutdown, CORS, observability.
- **Out of scope:** Kafka publishing (M2-T3), UI rendering (M2-T4).
- **Prerequisites:** `docker compose up --build market-data-service`; `CORS_ORIGIN=http://localhost:5173`; `INTERNAL_TICK_API_KEY` unset (dev mode).

---

## Test Cases

### Integration — Tick Simulation and Watchlist

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-01 | `GET /watchlist` after simulator runs | Returns quotes for AAPL, MSFT, GOOGL, TSLA, NVDA with bid/ask/last/volume/timestamp | ✓ All 5 symbols returned with live data | Pass |
| INT-02 | Watchlist quote fields are valid numbers | bid ≤ ask, last within spread, volume ≥ 0 | ✓ | Pass |
| INT-03 | `GET /metrics` after simulator runs | Contains `market_tick_emitted_total`, `market_tick_rejected_total`, `market_tick_rate_per_second` | ✓ | Pass |

### Integration — Tick Ingestion (`POST /ticks`)

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-04 | Valid tick payload | 202 `{"accepted": true}` | ✓ | Pass |
| INT-05 | Invalid payload: bid > ask | 400 Bad Request | ✓ | Pass |
| INT-06 | Invalid payload: missing symbol | 400 Bad Request | ✓ | Pass |
| INT-07 | Rejection counter increments after invalid payloads | `market_tick_rejected_total` increases by number of rejections | ✓ (confirmed 2 rejections after 2 invalid POSTs) | Pass |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | `GET /watchlist` response schema | `{ quotes: Array<{symbol, bid, ask, last, volume, timestamp}>, asOf: string }` | Pass |
| CON-02 | `POST /ticks` 202 response | `{ accepted: true }` | Pass |
| CON-03 | Prometheus metrics format | Lines match `# HELP`, `# TYPE`, `<metric> <value>` pattern | Pass |

### Resilience

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| RES-01 | SIGTERM during simulation | `tick simulator stopped` logged; readiness flips to NOT READY; process exits cleanly | ✓ | Pass |
| RES-02 | Service restart preserves configured symbols | After restart, watchlist returns same 5 symbols | ✓ | Pass |

### Observability

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| OBS-01 | `trace_id` in request logs | Every completed request log includes `trace_id`, `span_id` | ✓ | Pass |

### Performance Baseline

| Metric | Target | Actual | Status |
|---|---|---|---|
| Tick emission rate (5 symbols, 500ms interval) | ~10 ticks/sec | 9.95 ticks/sec | Pass |
| Total ticks after ~4 min uptime | > 1000 | 2455 | Pass |

---

## Re-validation — 2026-03-09 (after @sec fix loop)

Following S2-01, S2-02, S2-03 fixes:

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| SEC-01 | Service starts with `CORS_ORIGIN` set | No wildcard CORS warning in logs | ✓ | Pass |
| SEC-02 | `InternalApiKeyGuard` present on `POST /ticks` | Guard wired, no DI errors at startup | ✓ | Pass |
| SEC-03 | All 43 unit tests pass after security fixes | Zero failures | ✓ | Pass |

---

## Verdict

`PASS` — all AC verified. Throughput baseline recorded. Security fixes validated.

---

## Evidence

- Unit tests: 43 tests, 13 suites — all pass
- `GET /watchlist` via API Gateway with JWT: returns live quotes for all 5 symbols
- `POST /ticks` invalid payloads: 400 returned, `market_tick_rejected_total 2` confirmed in `/metrics`
- SIGTERM: `docker stop pulsedesk-market-data-service-1` → `tick simulator stopped` in logs
- Throughput: `market_tick_rate_per_second 9.95` after ~4 min runtime
