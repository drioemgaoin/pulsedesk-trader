# Test Plan — M1 Foundation Sign-off (covers T1–T4)

- **TP ID:** `TP-M1-T5-foundation-signoff`
- **Date:** `2026-03-09`
- **Last updated:** `2026-03-09`
- **Status:** `active`
- **Owner:** `@qa`
- **Related milestone/task:** M1-T5 (sign-off covering T1, T2, T3, T4)
- **Verdict:** `PASS`

---

## Scope

- **In scope:** Service scaffold correctness (T1), compose stack startup (T2), CI pipeline (T3), observability plumbing (T4).
- **Out of scope:** Business logic, auth, market data — covered in M2.
- **Prerequisites:** Docker daemon running; clean clone with `docker compose up --build`.

---

## Test Cases

### Integration — T1: Service Scaffold

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-01 | All 7 backend services boot and report healthy | `GET /health` → `{"status":"ok"}` on each | Confirmed for all 7 services | Pass |
| INT-02 | Readiness probe responds correctly | `GET /ready` → `{"status":"ready"}` | Confirmed | Pass |
| INT-03 | Metrics stub endpoint responds | `GET /metrics` → 200 | Confirmed | Pass |
| INT-04 | SIGTERM triggers graceful shutdown | Readiness flips to NOT READY before drain; process exits cleanly | Confirmed on api-gateway | Pass |
| INT-05 | `pnpm build` succeeds across all packages | Zero TS errors, zero lint errors | Confirmed | Pass |

### Integration — T2: Compose Stack

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-06 | `docker compose up --build` starts all 16 services | All services reach `healthy` within 5 minutes | Confirmed after two bug fixes | Pass |
| INT-07 | Services start in dependency order | App services wait for postgres, valkey, kafka `healthy` | Confirmed via `depends_on` + health checks | Pass |
| INT-08 | `docker compose down` stops all services cleanly | No zombie processes | Confirmed | Pass |

### Integration — T4: Observability

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| INT-09 | `x-request-id` generated on requests without header | Response includes `x-request-id` UUID | Confirmed | Pass |
| INT-10 | `x-request-id` preserved when sent in request | Response echoes exact same ID | Confirmed | Pass |
| INT-11 | `trace_id` present in structured log output | Log lines include `trace_id`, `span_id`, `trace_flags` | Confirmed in docker logs | Pass |

### Resilience

| ID | Scenario | Expected result | Actual result | Status |
|---|---|---|---|---|
| RES-01 | Service receives SIGTERM during idle | Readiness flips to NOT READY; exits within 25s | Confirmed | Pass |

---

## Findings

None. Two bugs were found and fixed during validation (not blocking):

| ID | Severity | Description | Status |
|---|---|---|---|
| B01 | Medium | `kafka-topics.sh` not in PATH in `apache/kafka:3.7.1` — health check failed | Fixed: absolute path `/opt/kafka/bin/kafka-topics.sh` |
| B02 | Medium | `localhost` resolves to `::1` (IPv6) in Alpine containers, Fastify binds IPv4 only — health check failed | Fixed: all health checks use `127.0.0.1` |

---

## Verdict

`PASS` — all AC for T1–T4 verified. Two bugs found and fixed inline during validation.

---

## Evidence

- Unit test run: `pnpm test` — all pass clean across all packages
- Compose run: `docker compose up --build` — all 16 services reach `healthy`
- SIGTERM test: `docker stop <service>` → readiness flip confirmed in logs
- Correlation ID smoke: `curl -H "x-request-id: test-123"` → echoed in response
