# Test Plan — Risk Service Policy Engine

- **TP ID:** `TP-M3-T2-risk-service-policy-engine`
- **Date:** `2026-03-10`
- **Last updated:** `2026-03-10`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** `M3-T2`
- **Verdict:** `PASS`

---

## Scope

- **In scope:** `POST /v1/risk/evaluate` functional behavior, input validation, API key guard, Prometheus metrics, structured audit logs, graceful shutdown
- **Out of scope:** Order-to-risk orchestration (T3), persistence, Kafka integration (risk service has no broker dependency)
- **Prerequisites:** Unit tests passing (24/24); Docker stack running with rebuilt risk-service image

---

## Test Cases

### Integration

| ID | Scenario | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| INT-01 | GET /health | `wget http://127.0.0.1:3013/health` | `{"status":"ok"}` 200 | `{"status":"ok"}` 200 | Pass |
| INT-02 | GET /ready | `wget http://127.0.0.1:3013/ready` | `{"status":"ready"}` 200 | `{"status":"ready"}` 200 | Pass |
| INT-03 | GET /metrics — Prometheus format | `wget http://127.0.0.1:3013/metrics` | `text/plain` with counter + histogram | counter + histogram blocks returned | Pass |
| INT-04 | APPROVED — order within all limits (qty:10, price:150, notional:1500 < 100000) | POST with valid API key | `{"outcome":"APPROVED","reasonCode":"NONE","reasons":[]}` | As expected | Pass |
| INT-05 | REJECTED — quantity exceeded (qty:1001 > 1000, price:1 → notional safe) | POST with valid API key | `QUANTITY_LIMIT_EXCEEDED`, reason string contains "1001" | As expected | Pass |
| INT-06 | REJECTED — notional exceeded (qty:10, price:15000, notional:150000 > 100000) | POST with valid API key | `NOTIONAL_LIMIT_EXCEEDED`, reason string contains "150000.00" | As expected | Pass |
| INT-07 | REJECTED — both limits exceeded (qty:1001, price:200) | POST with valid API key | `MULTIPLE_LIMITS_EXCEEDED`, two reasons | As expected | Pass |
| INT-08 | APPROVED — MARKET order (no limitPrice), qty within limit | POST without limitPrice | `APPROVED`, notional check skipped | As expected | Pass |

### Contract

| ID | Contract | Assertion | Status |
|---|---|---|---|
| CON-01 | Response shape always includes `outcome`, `reasonCode`, `reasons[]` | All INT responses verified | Pass |
| CON-02 | Prometheus metrics accumulate per outcome label | After 5 evaluations: `APPROVED=2`, `REJECTED=3`; after 55: `APPROVED=52`, `REJECTED=3` | Pass |
| CON-03 | Audit log entry includes `orderId`, `commandId`, `symbol`, `quantity`, `limitPrice`, `outcome`, `reasonCode`, `latencyMs`, `trace_id`, `span_id` | Log output verified for all INT-04..08 evaluations | Pass |
| CON-04 | Prometheus actively scraped by Prometheus sidecar | `GET /metrics` log entry shows `user-agent: Prometheus/2.51.0` from `172.21.0.6` | Pass |

### Resilience / Edge Cases

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| RES-01 | Missing required field `commandId` | 400 Bad Request | 400 | Pass |
| RES-02 | No `x-api-key` header (key configured) | 401 Unauthorized | 401 | Pass |
| RES-03 | Negative `quantity` | 400 Bad Request | 400 | Pass |
| RES-04 | Wrong `x-api-key` value | 401 Unauthorized | 401 | Pass |
| RES-05 | SIGTERM graceful shutdown | Readiness flips NOT READY; hard timeout (25s) armed; clean stop | `SIGTERM received — readiness NOT READY`; container stopped cleanly | Pass |

### Performance Baseline

| Metric | Target | Actual | Status |
|---|---|---|---|
| p95 evaluation latency | < 10ms | < 1ms (all 55 evaluations in `latency_ms_bucket{le="1"}`) | Pass |
| 50 sequential requests | < 5000ms total | Sub-ms sequential loop, all 200 OK | Pass |
| Error rate under 50-req load | < 1% | 0% | Pass |

---

## Findings

| ID | Severity | Description | Status |
|---|---|---|---|
| F-01 | INFO | `risk_evaluation_latency_ms_sum` reports `1` across 55 evaluations — counter rolls to 0ms in sub-ms arithmetic. Latency tracking is functional; histogram buckets confirm all requests are sub-1ms. No action needed. | Closed |

---

## Verdict

**Final verdict:** `PASS`

All 8 integration scenarios, 4 contract checks, 5 resilience edge cases, and performance baseline pass. No open MEDIUM+ findings.

---

## Evidence

- Unit test run: `Tests: 24 passed, 24 total` — 5 suites (domain, use-case, metrics, guard, controller)
- Coverage (changed modules): `evaluate-risk.use-case.ts` 100%/100%, `risk-decision.ts` 100%/100%, `risk-limits.ts` 100%/75%, `risk-metrics.service.ts` 100%/100%, `risk.controller.ts` 100%/100% — all above DoD gates (line ≥ 80%, branch ≥ 70%)
- Integration run: `docker compose exec risk-service wget` — all assertions verified against live container
- Graceful shutdown: `docker compose stop risk-service` — SIGTERM hook confirmed in logs
- Prometheus scrape: active scrape by Prometheus confirmed in access logs (`user-agent: Prometheus/2.51.0`)
- Load: 50 sequential requests, 0 errors, all sub-1ms
