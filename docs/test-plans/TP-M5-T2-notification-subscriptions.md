# Test Plan — Notification Subscriptions and Channel Model

- **TP ID:** `TP-M5-T2-notification-subscriptions`
- **Date:** 2026-03-11
- **Last updated:** 2026-03-11
- **Status:** active
- **Owner:** @qa
- **Related milestone/task:** M5-T2
- **Verdict:** PASS

---

## Scope

- **In scope:** Symbol subscription filtering, subscribe/unsubscribe message handlers, backpressure (slow consumer drop), `active_connections`/`messages_sent`/`messages_dropped` metrics, WS message contract types (`SubscribedAckV1`)
- **Out of scope:** Account-scoped subscriptions (no order/fill Kafka consumer yet — deferred to T3/T4 when fill events flow end-to-end), UI integration, e2e stack

---

## Test Cases

### Unit / Component

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| U-01 | `handleConnection` increments `activeConnections` | +1 per client | Pass |
| U-02 | `handleDisconnect` decrements `activeConnections` and removes subscription entry | -1, map entry gone | Pass |
| U-03 | `handleSubscribe` normalises to uppercase, trims whitespace, adds to set | `['AAPL','MSFT']` for `['aapl',' msft ']` | Pass |
| U-04 | `handleSubscribe` sends ack with current symbol set | `{ event: 'subscribed', data: { symbols: [...] } }` | Pass |
| U-05 | `handleUnsubscribe` removes symbol and acks remaining set | TSLA removed, AAPL remains | Pass |
| U-06 | `broadcast` only delivers to clients subscribed to the event symbol | AAPL client gets tick, TSLA client does not | Pass |
| U-07 | `broadcast` skips clients not in WS_OPEN state | CONNECTING/CLOSING/CLOSED clients skipped | Pass |
| U-08 | `broadcast` drops message when `_socket.writableLength > 64 KiB` | `send` not called, `droppedMessages++` | Pass |
| U-09 | `broadcast` terminates client on send error callback | `client.terminate()` called once | Pass |
| U-10 | `broadcast` increments `messagesSent` on successful send callback | +1 per successful send | Pass |
| U-11 | `getMetrics` returns zeroed counters on fresh instance | `{ activeConnections:0, messagesSent:0, droppedMessages:0 }` | Pass |
| U-12 | `getMetrics` reflects live connection/message counts | Correct after connect+broadcast cycle | Pass |
| U-13 | Unsubscribed client (no symbols) receives no messages | `send` never called | Pass |

### Contract

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| C-01 | Subscribe ack shape matches `SubscribedAckV1` | `{ event: 'subscribed', data: { symbols: string[] } }` | Pass |
| C-02 | Unsubscribe ack contains only remaining symbols | Removed symbol absent from ack | Pass |
| C-03 | Broadcast payload matches `MarketTickEvent` schema | All required fields present with correct types | Pass |
| C-04 | `SubscribedAckV1` exported from `@pulsedesk/contracts` | Available at compile time | Pass (build passes) |

### Metrics

| ID | Scenario | Expected result | Status |
|---|---|---|---|
| M-01 | `GET /metrics` returns `ws_active_connections` gauge with value | Prometheus text format, correct value | Pass |
| M-02 | `GET /metrics` returns `ws_messages_sent_total` counter | Counter with value | Pass |
| M-03 | `GET /metrics` returns `ws_messages_dropped_total` counter | Counter with value | Pass |
| M-04 | `GET /metrics` includes `# HELP` and `# TYPE` annotations | Prometheus format compliant | Pass |

---

## Coverage — Changed Modules

| Service | File | Lines | Branches | Gate |
|---------|------|-------|----------|------|
| notification-service | `market-stream.gateway.ts` | 100% | 81.81% | ✅ |
| notification-service | `metrics.controller.ts` | 100% | 100% | ✅ |
| notification-service | `kafka-market-tick-consumer.ts` | 100% | 100% | ✅ (unchanged) |

**Note on `market-stream.gateway.ts` branch 81.81% (lines 65–77):** The uncovered branches are the `?? new Set<string>()` fallbacks in `handleSubscribe`/`handleUnsubscribe` — triggered only when a client calls subscribe without first connecting. This is defensive code and cannot occur via the normal connection lifecycle. Acceptable gap.

**Note on bootstrap files (`main.ts`, `app.module.ts`, `app.readiness.ts`, `instrumentation.ts`):** 0% coverage is pre-existing across all services. Not a regression.

---

## Build and Lint

| Check | Result |
|-------|--------|
| `pnpm build` (notification-service) | ✅ Pass |
| `pnpm lint` (notification-service) | ✅ Pass |
| `pnpm test` (27 tests / 4 suites) | ✅ All pass |

---

## AC Verification

| AC | Evidence | Status |
|----|----------|--------|
| Notification service supports scoped subscriptions (account/symbol) | Symbol subscriptions: `handleSubscribe`/`handleUnsubscribe` with per-client `Map<WebSocket,Set<string>>`; filtering in `broadcast()`. Account-level scope deferred — no account-bearing Kafka consumer exists yet (T3/T4). | ✅ (symbol) / deferred (account) |
| Backpressure strategy exists for slow consumers | `writableLength > 64 KiB` → drop + log; send error callback → `client.terminate()` | ✅ |
| `active_connections` and `messages_sent` metrics are available | `GET /metrics` emits `ws_active_connections`, `ws_messages_sent_total`, `ws_messages_dropped_total` in Prometheus text format | ✅ |

---

## Verdict: PASS
