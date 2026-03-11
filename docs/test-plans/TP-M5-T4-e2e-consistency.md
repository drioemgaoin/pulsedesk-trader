# Test Plan — TP-M5-T4-e2e-consistency

- **Milestone / Task:** M5 / T4 — End-to-end consistency tests
- **Date:** 2026-03-11
- **Owner:** @qa
- **Status:** PASS

---

## Scope

Verify that:
1. The WS gateway delivers ticks only to subscribed clients and tracks delivery metrics correctly (query/read-model consistency).
2. Reconnect/resubscribe logic does not duplicate or lose post-reconnect updates.
3. Known eventual-consistency windows are measured and documented.

---

## AC Checklist

| # | AC | Evidence |
|---|----|----------|
| 1 | Tests verify query/read model consistency with event-driven updates | `market-stream.consistency.spec.ts` — 12 tests covering subscription filtering, payload correctness, and broadcast metrics |
| 2 | Reconnect/resubscribe logic does not duplicate or lose updates | `market-stream.consistency.spec.ts` (AC2 group, 4 tests) + `useMarketStream.reconnect.spec.ts` (8 tests) |
| 3 | Known eventual-consistency windows are measured and documented | See §Eventual-Consistency Window below |

---

## Test Matrix

### notification-service unit tests

| File | Tests | Result |
|------|-------|--------|
| `market-stream.consistency.spec.ts` | 12 | PASS |

### trader-ui unit tests

| File | Tests | Result |
|------|-------|--------|
| `useMarketStream.reconnect.spec.ts` | 8 | PASS |

### Pre-existing suites (unmodified, verified green)

| Project | Suite | Tests | Result |
|---------|-------|-------|--------|
| notification-service | `market-stream.gateway.spec.ts` | 22 | PASS |
| notification-service | `market-stream.gateway.contract.spec.ts` | 7 | PASS |
| notification-service | `kafka-market-tick-consumer.spec.ts` | 4 | PASS |
| notification-service | `metrics.controller.spec.ts` | 4 | PASS |
| trader-ui | All 11 spec files | 79 | PASS |
| **Total** | | **136** | **PASS** |

---

## Test Scenarios

### AC1 — Query / read-model consistency

| ID | Scenario | Result |
|----|----------|--------|
| CS-01 | Tick delivered only to client subscribed to that symbol | PASS |
| CS-02 | Correct tick payload forwarded (symbol, last, eventType) | PASS |
| CS-03 | Tick NOT delivered to client subscribed to different symbol | PASS |
| CS-04 | Tick delivered to all clients subscribed to broadcast symbol | PASS |
| CS-05 | Multiple ticks across symbols: no cross-contamination | PASS |
| CS-06 | `messagesSent` incremented per delivered tick | PASS |
| CS-07 | `messagesSent` NOT incremented for filtered-out ticks | PASS |
| CS-08 | `droppedMessages` incremented when write buffer > 64 KiB | PASS |

### AC2 — Reconnect / resubscribe correctness

| ID | Scenario | Result |
|----|----------|--------|
| RC-01 | No ticks delivered during disconnected window | PASS |
| RC-02 | Delivery resumes after reconnect + re-subscribe; no duplicates | PASS |
| RC-03 | Stale subscriptions cleaned up after disconnect | PASS |
| RC-04 | Idempotent subscribe: duplicate subscribe does not double-deliver | PASS |
| RC-05 | WS error → status transitions to `reconnecting` | PASS |
| RC-06 | Status transitions back to `connecting` after retry delay (1000 ms) | PASS |
| RC-07 | Re-subscribe message sent on new connection open | PASS |
| RC-08 | Snapshot retained across disconnect (no data loss at client) | PASS |
| RC-09 | Ticks accumulate correctly after reconnect (no missed-tick replay) | PASS |
| RC-10 | Backoff doubles on consecutive failures (1 s → 2 s → 4 s...) | PASS |
| RC-11 | Backoff capped at 30 s | PASS |
| RC-12 | Clean WS complete also triggers reconnect | PASS |

---

## Eventual-Consistency Window

### Definition

The eventual-consistency window is the period during which a client may miss tick updates between WS disconnect and successful reconnect + re-subscribe.

### Measurement

| Boundary | Latency |
|----------|---------|
| WS error detected by browser | ~0–200 ms (browser WS implementation) |
| First retry delay | 1 000 ms |
| Subsequent retries (exponential backoff) | 2 s, 4 s, 8 s … up to 30 s cap |
| Re-subscribe message sent on open | Immediate (openObserver fires synchronously on connect) |
| Gateway routes first tick post-subscribe | Next Kafka poll cycle (≤ 100 ms at current poll interval) |

**Typical gap (healthy network):** ~1 200 ms (1 s retry + ~200 ms connect + subscribe roundtrip)

**Worst case (repeated failures):** up to 30 s per cycle until recovery

### Design decision

No tick replay on reconnect — the client receives the next live tick after re-subscribe, not missed ticks. This is by design (no tick buffer / event-sourced replay at the WS layer). The stale snapshot remains visible during the gap, preventing blank displays. This aligns with the system's "at-most-once delivery" contract for realtime market data.

### Documentation reference

`services/notification-service/src/interfaces/ws/market-stream.consistency.spec.ts` — AC2 test group documents the expected behaviour via executable specifications.

---

## Build / Lint / DoD Gates

| Gate | Result |
|------|--------|
| `pnpm build` (trader-ui) | PASS — 1.07 s, 0 errors |
| `pnpm lint` (trader-ui) | PASS — 0 errors |
| `pnpm lint` (notification-service) | PASS — 0 errors |
| `pnpm build` (notification-service) | PASS — 0 errors |
| trader-ui tests 87/87 | PASS |
| notification-service tests 49/49 | PASS |
| Total tests 136/136 | PASS |

---

## Verdict

**QA PASS** — all 20 new T4 tests pass, all 116 pre-existing tests remain green, build and lint clean, all three T4 AC verified, eventual-consistency window documented.
