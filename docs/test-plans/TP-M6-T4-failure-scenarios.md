# Test Plan: M6-T4 — Failure Scenario Validation

**Milestone:** M6 — Resilience and Observability
**Task:** T4 — Failure scenario validation
**AC under test:**
1. Simulated dependency outages show graceful degradation
2. Recovery behavior after dependency restoration is validated
3. No crash-loop behavior under tested failure modes

---

## Test File

| File | Tests | Scope |
|------|-------|-------|
| `services/api-gateway/src/failure-scenarios.spec.ts` | 22 | Resilience stack: CircuitBreakerRegistry + LoadSheddingInterceptor + ProxyService |

---

## Coverage by AC

### AC1 — Simulated dependency outages show graceful degradation

**Scenario 1: Upstream complete outage** (4 tests):

| Test | Behaviour validated |
|------|---------------------|
| Circuit still closed → returns upstream error, no crash | Uncaught exceptions bubble as `Error`, not unhandled rejections |
| Circuit open → `ServiceUnavailableException`, no crash | Breaker opens after 6 failures (volumeThreshold); throws NestJS HTTP exception |
| Circuit open → upstream fn not called | Breaker short-circuits before the fn is invoked |
| Per-upstream isolation — portfolio unaffected by order outage | Each URL origin gets its own breaker; others remain closed |

**Scenario 4: Gateway saturation** (5 tests):

| Test | Behaviour validated |
|------|---------------------|
| Excess GET → `ServiceUnavailableException` thrown synchronously | Load-shedding interceptor rejects at threshold |
| `Retry-After: 2` header set before throwing | Response header written before exception propagates |
| POST passes through even above threshold | Non-critical shedding applies to GET only; write ops are protected |
| In-flight counter resets to 0 on completion | No counter leak on happy path |
| In-flight counter resets to 0 on upstream error | No counter leak on error path |

### AC2 — Recovery behavior after dependency restoration is validated

**Scenario 2: Recovery after upstream restoration** (3 tests):

| Test | State transition validated |
|------|---------------------------|
| After `resetTimeout` (15 s) → circuit moves to HALF-OPEN, probe goes through | `jest.advanceTimersByTime(16_000)` triggers opossum half-open; probe fn called once |
| Successful probe → circuit returns to CLOSED | `getStates()` shows `'closed'` after one success in half-open |
| Failed probe → circuit re-opens | `getStates()` shows `'open'` after failed probe; countdown restarts |

### AC3 — No crash-loop behavior under tested failure modes

**Scenario 3: Transient failure + retry** (5 tests):

| Test | Crash-avoidance validated |
|------|--------------------------|
| Transient 5xx → retry succeeds on 2nd attempt | No crash; observable completes with success value |
| All 3 attempts fail → `BadGatewayException` thrown | Retry exhaustion produces HTTP exception, not unhandled rejection |
| POST not retried (non-idempotent) | Single attempt; exception on first failure |
| 404 not retried (non-retryable 4xx) | Single attempt; exception on 4xx |
| Open circuit aborts retry loop | Registry throws `ServiceUnavailableException`; retry loop not entered |

**Scenario 5: No crash-loop — all error paths produce HTTP exceptions** (5 tests):

| Failure mode | Expected exception |
|---|---|
| Upstream `TimeoutError` | `BadGatewayException` |
| Upstream `ECONNRESET` (unknown error) | `BadGatewayException` |
| Upstream 503 with body | `HttpException` (status 503 preserved) |
| Circuit open | `ServiceUnavailableException` |
| Load shed (threshold=0) | `ServiceUnavailableException` (synchronous) |

All 5 verify that errors surface as NestJS HTTP exceptions (not unhandled Promise rejections).

---

## Test run summary

```
PASS src/failure-scenarios.spec.ts

Test Suites:  1 passed,   1 total
Tests:       22 passed,  22 total
Full suite:  179 passed, 179 total  (16 suites, 0 regressions)
Date:        2026-03-12
```
