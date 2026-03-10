# Test Plan — Order-to-Risk Orchestration Path

- **TP ID:** `TP-M3-T3-order-risk-orchestration`
- **Date:** `2026-03-10`
- **Last updated:** `2026-03-10`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** `M3-T3`
- **Verdict:** `PASS`

---

## Scope

- **In scope:** `SubmitOrderUseCase` risk integration (approve/reject/timeout paths), `RiskHttpClient` HTTP adapter (request format, error propagation, circuit breaker init), `IRiskClient` port contract, idempotency replay safety, fail-closed behavior, structured log fields
- **Out of scope:** Live docker compose stack integration (requires network); circuit breaker state transitions under sustained load (T4+ scope); order-service metrics (deferred to T4+); execution event emission (T4)
- **Prerequisites:** Unit tests passing (`pnpm test` — 35/35); `opossum` and `@types/opossum` installed in order-service

---

## Test Cases

### Integration

| ID | Scenario | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| INT-01 | Order within risk limits | `execute(VALID_CMD)` with risk mock returning `APPROVED` | `order.status=ACCEPTED`, `repo.save` called once, `risk.evaluate` called once | `status=ACCEPTED`, save×1, evaluate×1 | Pass |
| INT-02 | Order exceeds quantity limit | `execute(VALID_CMD)` with risk mock returning `REJECTED / QUANTITY_LIMIT_EXCEEDED` | `order.status=REJECTED`, `rejectionReason` contains `QUANTITY_LIMIT_EXCEEDED`, `repo.save` called once | `status=REJECTED`, reason contains `QUANTITY_LIMIT_EXCEEDED`, save×1 | Pass |
| INT-03 | Risk service unreachable (timeout) | `execute(VALID_CMD)` with risk mock throwing `Error('Request timed out')` | `order.status=REJECTED`, `rejectionReason` contains `RISK_TIMEOUT`, `repo.save` called once (fail-closed) | `status=REJECTED`, reason contains `RISK_TIMEOUT`, save×1 | Pass |
| INT-04 | Replay same `commandId` | `execute(VALID_CMD)` with `findByCommandId` returning existing order | Returns existing order, `risk.evaluate` NOT called, `repo.save` NOT called | `created=false`, evaluate×0, save×0 | Pass |
| INT-05 | Domain validation failure | `execute({...VALID_CMD, quantity: -1})` | `OrderValidationError` thrown before risk call or DB write | Throws `'quantity must be greater than 0'`, evaluate×0, save×0 | Pass |
| INT-06 | Symbol normalisation | `execute({...VALID_CMD, symbol: 'aapl'})` with APPROVED risk | Persisted order `symbol='AAPL'` | `symbol='AAPL'` | Pass |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | `IRiskClient.evaluate` request shape | `RiskHttpClient` sends `{ symbol, quantity, limitPrice }` body to `POST /v1/risk/evaluate` with `x-api-key` header | `fetchMock` called with correct URL, method, and headers — confirmed by `risk-http.client.spec.ts` INT payload test | Pass |
| CON-02 | `RiskEvaluationResult` shape | Port defines `{ outcome: 'APPROVED'\|'REJECTED', reasonCode: string, reasons: string[] }` — matches risk-service `POST /v1/risk/evaluate` response contract | Port shape verified against risk-service `EvaluateRiskUseCase` output (T2 implementation) | Pass |
| CON-03 | Rejection reason format in `orders` record | Persisted `rejectionReason` = `"${reasonCode}: ${reasons.join(', ')}"` | `order.rejectionReason` contains `QUANTITY_LIMIT_EXCEEDED` with full reason string in INT-02 | Pass |
| CON-04 | `riskOutcome` and `riskLatencyMs` in structured log | Structured log entry on every new order submission includes `riskOutcome` and `riskLatencyMs` fields | Log output in test run confirms both fields present with correct values | Pass |

### Resilience / Edge Cases

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| RES-01 | Fail-closed on timeout | Timeout/circuit-open → order REJECTED, never ACCEPTED without valid risk decision | `RISK_TIMEOUT` path saves REJECTED — confirmed INT-03 | Pass |
| RES-02 | Fail-closed on non-2xx from risk service | `RiskHttpClient` throws `Error('Risk service returned HTTP 500')` → bubbles to use case catch block → RISK_TIMEOUT rejection | `risk-http.client.spec.ts` RES-01 confirms throw; use case catch block handles all exceptions uniformly | Pass |
| RES-03 | Idempotency on duplicate commandId | Second submit with same `commandId` returns existing order without re-evaluating risk | INT-04 confirmed — `findByCommandId` short-circuits before risk call | Pass |
| RES-04 | RISK_SERVICE_URL unset at startup | `onModuleInit` logs WARN; subsequent `evaluate` call throws (fetch constructs invalid URL) → use case catches → RISK_TIMEOUT | `risk-http.client.spec.ts` "URL not configured" suite confirms throw; `SubmitOrderUseCase` catch block handles it fail-closed | Pass |
| RES-05 | Single DB write — no PENDING state persisted | `repo.save` called exactly once with ACCEPTED or REJECTED order, never with PENDING | All INT scenarios confirm `save` called once with final state | Pass |

### Performance Baseline

| Metric | Target | Actual | Status |
|---|---|---|---|
| Risk evaluation adds no I/O overhead in unit tests | 0ms (mocked) | `riskLatencyMs: 0` in all test log lines | Pass |
| p95 latency budget (live stack) | < 100ms (NFR-04) | Not measured — live stack integration deferred; circuit breaker `timeout=2000ms` is within NFR-04 budget on happy path | Deferred |

---

## Findings

| ID | Severity | Description | Status |
|---|---|---|---|
| QA-T3-01 | INFO | `AbortController` timer and Opossum `timeout` both fire at the same `timeoutMs` value. `AbortController` fires first (same tick), throws `AbortError`, which Opossum records as a circuit failure. Behaviour is correct and intentional — dual timeout is redundant but harmless. No action required. | Accepted |
| QA-T3-02 | INFO | `RISK_SERVICE_URL` unset → `fetch` receives `"/v1/risk/evaluate"` (relative URL). Node `fetch` throws on relative URLs without a base. This correctly surfaces as a thrown error → fail-closed. A startup guard (`if (!riskServiceUrl) throw`) would make the misconfiguration more explicit, but current warn-log + fail-closed is acceptable for T3. Track: consider startup validation in M8 hardening. | Open / Track |

---

## Verdict

**Final verdict: `PASS`**

All four T3 AC verified:
- ✅ Order Service calls Risk Service before accepting executable orders (INT-01, INT-02)
- ✅ Rejected orders persist with explicit rejection reason (INT-02, INT-03 — `rejectionReason` field populated)
- ✅ Timeout/retry strategy avoids duplicate decision side effects (RES-01, RES-03, RES-05 — fail-closed + commandId idempotency)
- ✅ Integration tests cover allow, reject, and timeout scenarios (INT-01, INT-02, INT-03, INT-04)

No MEDIUM+ open findings.

---

## Evidence

- Unit test run: `Test Suites: 6 passed, 6 total — Tests: 35 passed, 35 total`
- Lint: clean (0 errors)
- Build: clean (`nest build` with `prisma generate` prebuild)
- New suites: `submit-order.use-case.spec.ts` (5 scenarios), `risk-http.client.spec.ts` (6 scenarios)
