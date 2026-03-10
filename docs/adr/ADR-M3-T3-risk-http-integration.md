# ADR-M3-T3 — Synchronous HTTP Integration: Order Service → Risk Service

- **Date:** 2026-03-10
- **Status:** accepted
- **Milestone/Task:** M3-T3
- **Deciders:** @arch

---

## Context

T3 wires the Order Service and Risk Service together so that no order is accepted without a risk decision. Two integration patterns are available:

**Option A — Synchronous HTTP (chosen)**
Order Service calls Risk Service via HTTP before persisting the final order state. The caller receives a deterministic ACCEPTED/REJECTED response in one round-trip.

**Option B — Async event (deferred)**
Order Service emits a `RiskRequested` event; Risk Service consumes it, evaluates, and emits `RiskDecided`; Order Service consumes `RiskDecided` and updates order state. The submit endpoint returns PENDING immediately.

## Decision

**Use synchronous HTTP for T3.** Async event flow is deferred to a later milestone (T6/T7) when the order blotter and notification stream are wired end-to-end.

### Rationale

| Criterion | Sync HTTP | Async event |
|---|---|---|
| Submit latency | Sub-10ms risk call on happy path; fits NFR-04 (p95 < 100ms) | PENDING-then-callback; UI polling or push needed |
| Caller simplicity | Single round-trip, final state in response | Two-phase; client must poll/subscribe for final status |
| Idempotency | Risk service is stateless; retrying same inputs always gives same output | Consumer idempotency + event dedup required |
| T3 scope fit | Minimal new surface — HTTP client + circuit breaker | Requires Kafka consumer in order-service and state machine for PENDING→ACCEPTED/REJECTED updates |
| Risk if Risk Service is down | Fail-closed (order rejected with RISK_TIMEOUT) | Fail-open risk: order stays PENDING indefinitely without consumer |

The sync path is strictly simpler for T3 and aligns with the p95 latency target. The async path is the right long-term answer for high-throughput scale and is captured as a future evolution path.

## Circuit Breaker Configuration (Opossum)

Opossum is the approved circuit breaker library (PROJECT.md § 5.1). T3 configuration:

| Parameter | Value | Rationale |
|---|---|---|
| `timeout` | 2000ms | 2× the degraded p95 budget of 300ms per single call; leaves room for DB writes within NFR-05 |
| `errorThresholdPercentage` | 50 | Open after half of requests fail in the rolling window |
| `resetTimeout` | 10 000ms | Try half-open after 10s to recover from transient outages |
| `volumeThreshold` | 5 | Need at least 5 requests before opening to avoid false-positive on startup |

Fail behavior: when circuit is open or `fetch` throws/times out, the order is rejected with `RISK_TIMEOUT: risk evaluation unavailable`. **Fail-closed** is mandatory for a financial control gate.

## Consequences

- Order Service gains a new `RISK_SERVICE_URL` config dependency; must be set in docker-compose and `.env.example`.
- PENDING order state is not persisted in T3 (order saved in final ACCEPTED/REJECTED state only). PENDING state persistence remains valid for future async flow.
- Existing `submit-order.use-case` tests must be updated to inject a mocked `IRiskClient`.
- Risk Service timeout/availability becomes a direct dependency of order submission throughput — circuit breaker prevents cascading failure.
