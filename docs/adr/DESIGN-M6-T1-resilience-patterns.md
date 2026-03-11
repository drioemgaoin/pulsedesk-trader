# Design — M6-T1: Resilience Patterns in Critical Service Paths

**Date:** 2026-03-11
**Status:** PROPOSED
**Owner:** @arch

---

## 1. Critical Sync Call Paths

```text
Path A — Order intake (latency-critical, never shed)
  Client → API Gateway → Order Service → Risk Service (sync)
                    └──────────────────────────────────────→ [Kafka async → Execution → Portfolio]

Path B — Read queries (sheddable under load)
  Client → API Gateway → Valkey (watchlist cache)
  Client → API Gateway → Order Service  (GET /orders)
  Client → API Gateway → Portfolio Service (GET /positions)

Path C — Internal read (low saturation risk)
  Execution Service → Portfolio Service (Kafka, async only — no sync call; no action needed)
```

---

## 2. Current State vs Required

| Path | Timeout | Circuit Breaker | Retry+Jitter | Bulkhead | Load Shed |
|------|---------|-----------------|-------------|----------|-----------|
| Gateway → Order Service | 10 s (RxJS) | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| Gateway → Portfolio Service | 10 s (RxJS) | **MISSING** | **MISSING** | **MISSING** | — |
| Gateway → Valkey cache | node socket default | — | — | — | — |
| Order Service → Risk Service | 2 s (AbortController) | opossum ✓ | **MISSING** | **MISSING** | — |

---

## 3. Design Decisions

### 3.1 Circuit Breaker Library

**Decision:** Use `opossum` across all services (Apache 2.0, already in `order-service`).

Per-upstream breaker parameters:

| Upstream | timeout | errorThresholdPercentage | resetTimeout | volumeThreshold |
|----------|---------|--------------------------|--------------|-----------------|
| Order Service | 5 000 ms | 50 % | 15 000 ms | 5 |
| Portfolio Service | 3 000 ms | 50 % | 15 000 ms | 5 |
| Risk Service (existing) | 2 000 ms ✓ | 50 % ✓ | 10 000 ms ✓ | 5 ✓ |

Rationale: timeout budgets keep the Path A p95 < 300 ms (NFR-05) when risk is degraded; 15 s reset gives upstream time to recover.

### 3.2 Retry Policy

**Decision:** Use `p-retry` (MIT, self-hostable) with exponential backoff + full jitter.

Apply only to:
- **Idempotent GET** calls (orders, positions, watchlist).
- **POST /orders** — safe because callers must include idempotency keys (FR-04 / ADR-003).

Parameters:

```
retries: 2
minTimeout: 200 ms
factor: 2
jitter: 'full'   (randomises delay to prevent thundering herd)
```

Do NOT retry on: 4xx responses (except 408, 429), circuit-breaker open, or after a timeout abort.

### 3.3 Bulkhead / Concurrency Limits

**Decision:** Use `opossum` `capacity` option (built-in queue) to cap concurrent in-flight calls per upstream.

| Upstream | capacity (max queued + executing) |
|----------|-----------------------------------|
| Order Service | 100 |
| Portfolio Service | 50 |
| Risk Service (from Order Service) | 30 |

Requests beyond capacity are rejected immediately with 503 (before entering the breaker).
Rationale: prevents thread-pool saturation cascading (NFR-08).

### 3.4 Load Shedding

**Decision:** NestJS interceptor on API Gateway that tracks in-flight request count and rejects early on non-critical paths.

Trigger: in-flight count on the gateway process > 500 (configurable via `GATEWAY_LOAD_SHED_THRESHOLD`).

| Path | Action under load |
|------|-------------------|
| `POST /api/v1/orders` | Never shed — let circuit breaker decide |
| `GET /api/v1/orders` | Return 503 + `Retry-After: 2` |
| `GET /api/v1/positions` | Return 503 + `Retry-After: 2` |
| `GET /api/v1/watchlist` | Serve from Valkey cache only; 503 if cache miss |

---

## 4. Implementation Scope

| Component | Change |
|-----------|--------|
| `api-gateway` | Wrap `ProxyService.forward()` per-upstream in opossum breaker; add `p-retry` for GET calls; add `LoadSheddingInterceptor`; expose circuit state in `/metrics` |
| `order-service` | Add bulkhead (`capacity: 30`) to existing `RiskHttpClient` breaker; add `p-retry` for idempotent calls if needed; add fallback to metrics |
| `api-gateway` | `LoadSheddingInterceptor` — global for non-critical routes, bypassed for POST /orders |

No changes to `execution-service`, `portfolio-service`, `notification-service`, or `market-data-service` sync paths — they have no downstream sync dependencies.

---

## 5. New Dependencies

| Package | Version | License | Justification |
|---------|---------|---------|---------------|
| `opossum` | already in order-service | Apache 2.0 | extend to api-gateway |
| `p-retry` | ^6.2 | MIT | exponential backoff + jitter |

Both are free and self-hostable. No ADR required for `p-retry` (no stack deviation — adds reliability control to approved pattern).

---

## 6. NFR Coverage

| NFR | Before | After |
|-----|--------|-------|
| NFR-04 p95 order ack < 100 ms | Not guaranteed | Risk timeout budget (2 s) + bulkhead prevents saturation; happy path unaffected |
| NFR-05 p95 degraded < 300 ms before shedding | No shed policy | Load shedding interceptor enforces 503 before gateway itself degrades |
| NFR-08 sync dependency controls | Risk only | All gateway → upstream paths + risk bulkhead |
| NFR-09 overload control | None | Load shedding on non-critical endpoints |

---

## 7. Open Questions for @dev

| # | Question |
|---|---------|
| Q1 | Should circuit breaker state (open/closed/halfOpen) be published to Prometheus gauge? (Recommended — aligns with M6-T2 observability task) |
| Q2 | `GATEWAY_LOAD_SHED_THRESHOLD=500` — validate against actual compose resource limits before finalising |
