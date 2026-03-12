# Security Review — M8-T1

**Milestone:** M8 – Production Hardening and Deployment
**Task:** T1 – Security hardening review
**Reviewer:** @sec
**Date:** 2026-03-12
**Status:** COMPLETE — all CRITICAL/HIGH/MEDIUM findings fixed; LOW and INFO documented

---

## Scope

- API boundary auth and authorization paths
- Input and event schema validation coverage
- Dependency and container vulnerability posture
- Secrets and environment configuration

---

## Findings

### SEC-M8-T1-01 [CRITICAL — FIXED]
**JWT secret hardcoded fallback**
`services/api-gateway/src/infrastructure/auth/jwt.strategy.ts`

The `secretOrKey` constructor option fell back to the literal string `'local-dev-secret-change-in-prod'` when `JWT_SECRET` was unset. Any attacker knowing this string could forge valid tokens.

**Fix:** Replaced fallback with an IIFE that throws `Error('JWT_SECRET env var is required')` at startup. Service will refuse to start without the env var set.
**Status:** Fixed in this review.

---

### SEC-M8-T1-02 [HIGH — FIXED]
**Internal API key guards fail-open**
`services/order-service`, `services/risk-service`, `services/market-data-service`
`src/interfaces/http/guards/internal-api-key.guard.ts`

All three guards returned `true` (allow) when the `INTERNAL_*_API_KEY` env var was not set. In a production deployment where internal services are not network-isolated, a missing env var silently disabled auth.

**Fix:** Added a `constructor()` guard in all three services that throws at startup when `NODE_ENV === 'production'` and the key is unset. Local dev and CI remain unaffected (env var absent = open). Production deployments will refuse to start without the key explicitly set.
**Status:** Fixed in this review.

---

### SEC-M8-T1-03 [MEDIUM — FIXED]
**CORS wildcard allowed in api-gateway and execution-service without production guard**
`services/api-gateway/src/main.ts`, `services/execution-service/src/main.ts`

`market-data-service` and `notification-service` already threw on production wildcard CORS; `api-gateway` and `execution-service` silently defaulted to `*`.

**Fix:** Added the same production guard to both services:
```typescript
const corsOrigin = process.env['CORS_ORIGIN'] ?? '*';
if (corsOrigin === '*' && process.env['NODE_ENV'] === 'production') {
  throw new Error('CORS_ORIGIN must be set explicitly in production');
}
```
**Status:** Fixed in this review.

---

### SEC-M8-T1-04 [MEDIUM — FIXED]
**Portfolio-service Kafka fill event consumer — no field validation before use-case dispatch**
`services/portfolio-service/src/infrastructure/messaging/kafka-fill-event-consumer.ts`

After JSON.parse, the consumer called `processFill.execute(event)` with unvalidated data. A malformed event could propagate undefined/NaN values into the position ledger.

**Fix:** Added a field validation block (poison-pill pattern) checking `orderId`, `executionId`, `symbol`, and `quantity` before dispatching to the use-case. Malformed events are logged and their offset committed to prevent reprocessing.
**Status:** Fixed in this review.

---

### SEC-M8-T1-05 [MEDIUM — FIXED]
**Portfolio-service market tick consumer — no field validation before cache write**
`services/portfolio-service/src/infrastructure/messaging/kafka-market-tick-consumer.ts`

`tick.symbol` and `tick.last` were used directly after JSON.parse without type or value checks. A non-finite `last` value (NaN, Infinity) could corrupt the in-memory price cache used for P&L calculations.

**Fix:** Added guards: `symbol` must be a non-empty string; `last` must be a finite number. Malformed ticks are silently skipped (cache not updated).
**Status:** Fixed in this review.

---

### SEC-M8-T1-06 [LOW — FIXED]
**No dependency vulnerability scanning in CI**
`.github/workflows/ci.yml`

No `pnpm audit` or equivalent step existed. Vulnerable transitive dependencies would not be caught automatically.

**Fix:** Added an `audit` job (`pnpm audit --audit-level=high`) that runs in parallel with `lint` and gates the `test` job. Fails CI on high/critical severity advisories.
**Status:** Fixed in this review.

---

### SEC-M8-T1-07 [LOW — RISK ACCEPTED]
**Hardcoded credentials in docker-compose.yml**
`docker-compose.yml`, `.env.example`

`POSTGRES_PASSWORD`, `JWT_SECRET`, `DEMO_USERNAME`, `DEMO_PASSWORD` are set to well-known demo values. These are clearly annotated for local dev only and never appear in production secrets management.

**Remediation for production:** M8-T2 (Kubernetes/Helm) must inject all secrets from a secrets manager (e.g., Kubernetes Secrets, Vault). The `docker-compose.yml` remains a local dev convenience tool only.
**Status:** Risk accepted for demo/dev scope.

---

### SEC-M8-T1-08 [INFO]
**No centralized Kafka event schema validation (Zod/Avro)**

Event contracts are TypeScript interfaces (compile-time only). Runtime validation is manual per-consumer. Schema evolution is not versioned.

**Assessment:** Acceptable for current demo scale. A schema registry (Confluent / Avro) or Zod runtime parsing would be required before scaling to production event volume.
**Status:** Documented — deferred beyond M8.

---

### SEC-M8-T1-09 [INFO]
**No sensitive data redaction in Pino logs**

Error log objects may include raw values from event payloads. No token/credential masking is configured.

**Assessment:** Acceptable for demo. Production deployments should configure Pino `redact` for known sensitive fields.
**Status:** Documented — deferred beyond M8.

---

## Summary

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| SEC-M8-T1-01 | CRITICAL | JWT secret hardcoded fallback | **Fixed** |
| SEC-M8-T1-02 | HIGH | Internal API key guards fail-open | **Fixed** |
| SEC-M8-T1-03 | MEDIUM | CORS wildcard no production guard (api-gateway, execution-service) | **Fixed** |
| SEC-M8-T1-04 | MEDIUM | Portfolio fill consumer: no field validation | **Fixed** |
| SEC-M8-T1-05 | MEDIUM | Portfolio tick consumer: no field validation | **Fixed** |
| SEC-M8-T1-06 | LOW | No dependency audit in CI | **Fixed** |
| SEC-M8-T1-07 | LOW | docker-compose hardcoded credentials | Risk accepted — enforce in M8-T2 |
| SEC-M8-T1-08 | INFO | No centralized Kafka schema validation | Deferred |
| SEC-M8-T1-09 | INFO | No log redaction for sensitive fields | Deferred |

**Blocking issues for demo:** None — all CRITICAL/HIGH/MEDIUM fixed.
**Blocking issues for production:** SEC-M8-T1-07 (docker-compose credentials, LOW) must be addressed via M8-T2 secrets management before any multi-host deployment.
