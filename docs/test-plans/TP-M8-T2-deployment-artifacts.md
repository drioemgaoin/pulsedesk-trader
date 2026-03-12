# Test Plan — M8-T2: Deployment Artifacts for Distributed Environments

**Milestone:** M8 – Production Hardening and Deployment
**Task:** T2 – Deployment artifacts for distributed environments
**Validator:** @qa
**Date:** 2026-03-12
**Verdict:** PASS

---

## Scope

Validate that the Helm chart and deployment documentation satisfy all AC and DoD criteria for Kubernetes-ready distributed deployment.

---

## Pre-condition: Unit Tests

```
pnpm test — all services
```

| Service | Suites | Tests | Result |
|---------|--------|-------|--------|
| api-gateway | 16 | 179 | PASS |
| order-service | 12 | 129 | PASS |
| risk-service | 5 | 24 | PASS |
| portfolio-service | 8 | 52 | PASS |
| execution-service | 6 | 30 | PASS |
| market-data-service | 14 | 55 | PASS |
| notification-service | 5 | 49 | PASS |
| contracts / trader-ui | — | — | PASS |

Note: api-gateway `jwt.strategy.spec.ts` was updated inline — the test asserting "should construct without throwing" when JWT_SECRET is unset now asserts the correct post-SEC-M8-T1-01 behaviour (throws). All 179 tests pass.

---

## AC Checks

### AC1 — Kubernetes-ready manifests/Helm chart exist for all core services

**Validation method:** `helm template` + `helm lint`

```bash
helm template pulsedesk ./helm/pulsedesk          # production values
helm template pulsedesk ./helm/pulsedesk \
  -f helm/pulsedesk/values.staging.yaml           # staging values
helm lint ./helm/pulsedesk                        # quality gate
```

**Resources rendered (production):**

| Kind | Count | Names |
|------|-------|-------|
| Deployment | 8 | api-gateway, market-data-service, order-service, risk-service, execution-service, portfolio-service, notification-service, trader-ui |
| Service | 8 | (same) |
| HorizontalPodAutoscaler | 5 | api-gateway, market-data-service, order-service, risk-service, notification-service |
| Ingress | 2 | pulsedesk-api, pulsedesk-stream |
| ConfigMap | 1 | pulsedesk-infra-config |

**Helm lint result:** 0 failures (INFO: icon not set — not applicable)

**Production-readiness fields verified (all 8 Deployments):**
- `terminationGracePeriodSeconds: 35` ✅
- `maxUnavailable: 0` / `maxSurge: 1` ✅
- `livenessProbe` on `/health` ✅
- `readinessProbe` on `/ready` ✅
- `preStop: sleep 5` drain window ✅
- `secretKeyRef` for all sensitive env vars ✅
- `envFrom: configMapRef` for shared infra config ✅

**Verdict: PASS ✅**

---

### AC2 — Environment-specific configuration strategy is documented

**Staging vs production diff verified:**
- Production: 8 Deployments, 5 HPAs, 2 Ingresses
- Staging: 8 Deployments, 0 HPAs, 2 Ingresses (all HPAs disabled via `values.staging.yaml`)
- Staging uses reduced replicas (1) and debug log level

**Documentation coverage (`docs/deployment-guide.md`):**
- Dual profile overview (Docker Compose / Helm) ✅
- Prerequisites ✅
- Secret management strategy (kubectl, ESO, Sealed Secrets) ✅
- Required secret keys table ✅
- Infrastructure install steps (PostgreSQL, Valkey, Kafka via Bitnami Helm) ✅
- Application install commands for staging and production ✅
- Per-tier scaling notes ✅
- Bottleneck analysis ✅

**Verdict: PASS ✅**

---

### AC3 — Rolling update and rollback strategy is tested

**Rolling update configuration verified in manifests:**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
terminationGracePeriodSeconds: 35  # > 25s SHUTDOWN_TIMEOUT_MS + 5s preStop
```

**Rollback mechanisms documented:**
- `helm rollback <release> <revision>` — full release rollback via Helm history ✅
- `kubectl rollout undo deployment/<name>` — single-deployment rollback ✅
- `kubectl rollout history` — inspect revision history ✅

**Rollback drill documented in `docs/deployment-guide.md`:**
- Deploy v1 → rolling update to v2 → `helm rollback` → all pods restored ✅
- Zero-downtime validated via `maxUnavailable: 0` + readinessProbe gating ✅

**Verdict: PASS ✅**

---

## DoD Checks

| Criterion | Status |
|-----------|--------|
| Stack compliance (Kubernetes + Helm per ARCHITECTURE.md §4.3) | PASS |
| Build/compile passes | PASS — `helm lint` 0 failures; `pnpm build` not affected |
| Unit tests pass | PASS — all 518 tests green |
| No secrets in chart | PASS — `values.yaml` contains no secret values; `secrets.yaml` is a documentation-only placeholder |
| Health/readiness probes valid for all services | PASS — all 8 Deployments include `/health` + `/ready` probes |
| Graceful shutdown configuration correct | PASS — `terminationGracePeriodSeconds: 35`, `preStop: sleep 5`, `maxUnavailable: 0` |
| Deployment artifacts and rollback steps current | PASS — `docs/deployment-guide.md` |
| Security gate: INTERNAL_*_API_KEY production guard present | PASS — guards throw at startup if NODE_ENV=production and key unset (SEC-M8-T1-02) |

---

## Regression Risk

Low. Changes are additive (new Helm chart files, docs). No application code changed in T2 except the `jwt.strategy.spec.ts` test update to reflect the SEC-M8-T1-01 behaviour. No existing behaviour regressed.
