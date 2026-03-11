# ADR-M6-T1: Adopt p-retry for retry-with-jitter in gateway and order service

**Date:** 2026-03-11
**Status:** Accepted
**Deciders:** @arch

---

## Context

M6-T1 requires retry with exponential backoff + full jitter on idempotent sync calls. `opossum` handles circuit breaking and bulkhead, but does not provide retry logic. A retry utility is needed that:
- supports bounded exponential backoff
- supports full jitter (prevents thundering herd on recovery)
- filters non-retryable errors (4xx, open circuit, aborted)
- is free and self-hostable

## Decision

Adopt **`p-retry` ^6.2** (MIT, npm). Used only in infrastructure adapters — no domain layer dependency.

## Rejected alternatives

| Option | Reason rejected |
|--------|----------------|
| Manual `setTimeout` loop | No jitter, boilerplate, error-prone |
| `axios-retry` | Axios-specific; project uses native `fetch` + `@nestjs/axios` with RxJS |
| `rxjs` `retryWhen` / `retry` | Already available but verbose for backoff+jitter configuration; p-retry is more ergonomic |

## Consequences

- New package in `api-gateway` and `order-service` devDependencies/dependencies.
- Retry must not be applied to circuit-breaker-open errors (opossum throws `OpenCircuitError` — filter by type).
- Retry must not double-count against the circuit breaker (wrap retry outside the breaker, not inside).
