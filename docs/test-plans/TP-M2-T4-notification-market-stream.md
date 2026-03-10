# Test Plan — Notification Service Market Stream to UI

- **TP ID:** `TP-M2-T4-notification-market-stream`
- **Date:** `2026-03-10`
- **Last updated:** `2026-03-10`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** M2-T4
- **Verdict:** `PASS`

---

## Scope

- **In scope:** `KafkaMarketTickConsumer` (Kafka consumer lifecycle), `MarketStreamGateway` (WebSocket fan-out, connection tracking), `useMarketStream` hook (RxJS WS + reconnect), `WatchlistPanel` (snapshot rendering).
- **Out of scope:** Order/portfolio streams (future milestones), WebSocket auth (not in T4 AC), load test at cluster scale (deferred).
- **Prerequisites:** `docker compose up --build notification-service trader-ui` with Kafka and market-data-service healthy; `KAFKA_BROKER=kafka:9092`; `KAFKA_TOPIC_MARKET_TICKS=market.ticks.v1`.

---

## Test Cases

### Unit Tests

| Suite | Tests | Result |
|-------|-------|--------|
| `KafkaMarketTickConsumer` | 9 — connect/subscribe, disconnect, valid message broadcast, null message skip, malformed message no-throw, no-op without KAFKA_BROKER | Pass |
| `MarketStreamGateway` | 4 — connection counter increment/decrement, broadcast to OPEN clients only, JSON serialisation | Pass |
| `useMarketStream` | 4 — empty snapshot, new symbol added, same-symbol replaces (no stale state), multiple symbols | Pass |
| `WatchlistPanel` | 3 — "Connecting…" placeholder, row-per-symbol, formatted prices | Pass |
| **Total** | **20 tests, 2 suites (notification-service) + 2 suites (trader-ui)** | **Pass** |

### Integration — Consumer and WebSocket Delivery

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-01 | Connect to `ws://localhost:3016/stream` | Connection accepted; ticks arrive within 1s | ✓ Connected; first tick received in <500ms | Pass |
| INT-02 | Receive 20 ticks | All 5 symbols (AAPL, GOOGL, MSFT, NVDA, TSLA) present | ✓ All 5 symbols received across 20 messages | Pass |
| INT-03 | 3 concurrent WebSocket clients | All clients receive independent tick streams | ✓ client-A: 5, client-B: 5, client-C: 5 ticks | Pass |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | `MarketTickEvent` schema on WebSocket message | JSON with all required fields: `eventType`, `schemaVersion`, `symbol`, `bid`, `ask`, `last`, `volume`, `timestamp` | Pass |
| CON-02 | Schema versioning | `eventType: 'market.tick'`, `schemaVersion: 1` on every message | Pass |

### Resilience

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-04 | Disconnect and reconnect | Second session delivers fresh ticks; zero duplicate timestamps from session 1 | ✓ 0 duplicates — `fromBeginning: false` prevents replay | Pass |
| INT-05 | SIGTERM during active stream | Readiness flips NOT READY → Kafka consumer stopped → consumer disconnected; process exits cleanly | ✓ Shutdown sequence confirmed in logs | Pass |

---

## Findings

None — all AC verified on first pass.

---

## Verdict

`PASS` — Notification service consumes `market.ticks.v1` and broadcasts to all connected WebSocket clients with correct schema. Reconnect delivers fresh ticks without stale state. Graceful shutdown confirmed.

---

## Evidence

- Unit tests: 20 tests, 4 suites — all pass
- `ws://localhost:3016/stream` → JSON ticks with `eventType: 'market.tick'`, `schemaVersion: 1`
- All 5 default symbols (AAPL, MSFT, GOOGL, TSLA, NVDA) received within 5s
- 3 concurrent clients all received independent streams
- Reconnect: 0 duplicate timestamps across sessions (`fromBeginning: false`)
- SIGTERM: `SIGTERM received — readiness NOT READY` → `[Consumer] Stopped` → `Kafka consumer disconnected` — confirmed in logs
