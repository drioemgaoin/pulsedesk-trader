# PulseDesk Deployment Guide

**Milestone:** M8-T2 — Deployment artifacts for distributed environments
**Date:** 2026-03-12

---

## Overview

PulseDesk ships two deployment profiles:

| Profile | Tool | Purpose |
|---------|------|---------|
| **Local dev** | `docker compose up` | Single-command full stack on a laptop |
| **Distributed** | Helm + Kubernetes | Multi-server, production-grade deployment |

The Helm chart (`helm/pulsedesk/`) covers all **application services**. Infrastructure (PostgreSQL, Valkey, Kafka) must be provided separately — use managed services in production or the `docker-compose.yml` for local evaluation.

---

## Prerequisites

```bash
# Tools required
kubectl >= 1.28
helm >= 3.14
# Kubernetes cluster (EKS / GKE / AKS / k3s / minikube)
```

---

## Environment-Specific Configuration Strategy

### Principle: values file per environment, secrets from external store

```
helm/pulsedesk/
  values.yaml           # production defaults
  values.staging.yaml   # staging overrides (replicas, hosts, relaxed rate limits)
  # values.production.yaml — add if prod diverges further from defaults
```

**Non-sensitive config** lives in `values.yaml` and is injected as a `ConfigMap` (`pulsedesk-infra-config`). Every service receives it via `envFrom`.

**Sensitive config** (JWT_SECRET, database credentials, API keys) lives in a Kubernetes `Secret` named `pulsedesk-secrets`. This secret is **never** stored in the chart — it must be created before install via one of:

```bash
# Option A — from .env file (simple)
kubectl create secret generic pulsedesk-secrets \
  --from-env-file=.env.prod \
  --namespace pulsedesk

# Option B — External Secrets Operator (recommended for production)
# Install ESO, configure SecretStore pointing to Vault / AWS Secrets Manager,
# then create an ExternalSecret CR — see docs/adr/ for the ADR.

# Option C — Sealed Secrets (GitOps)
# kubeseal --cert <pub-key> --from-file=.env.prod | kubectl apply -f -
```

### Required secret keys

| Key | Used by |
|-----|---------|
| `JWT_SECRET` | api-gateway |
| `DEMO_USERNAME` | api-gateway |
| `DEMO_PASSWORD` | api-gateway |
| `INTERNAL_ORDER_API_KEY` | api-gateway, order-service |
| `INTERNAL_RISK_API_KEY` | risk-service |
| `INTERNAL_TICK_API_KEY` | market-data-service |
| `POSTGRES_PASSWORD` | postgresql sub-release |
| `DATABASE_URL` | order-service, risk-service, portfolio-service |

---

## Install

### 1. Create namespace and secrets

```bash
kubectl create namespace pulsedesk

kubectl create secret generic pulsedesk-secrets \
  --from-env-file=.env.prod \
  --namespace pulsedesk
```

### 2. Install infrastructure (if not using managed services)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami

# PostgreSQL
helm upgrade --install postgresql bitnami/postgresql \
  --namespace pulsedesk \
  --set auth.database=pulsedesk \
  --set auth.username=pulsedesk \
  --set auth.existingSecret=pulsedesk-secrets \
  --set auth.secretKeys.adminPasswordKey=POSTGRES_PASSWORD \
  --set auth.secretKeys.userPasswordKey=POSTGRES_PASSWORD

# Valkey
helm upgrade --install valkey bitnami/valkey \
  --namespace pulsedesk

# Kafka (KRaft mode, 3-broker cluster)
helm upgrade --install kafka bitnami/kafka \
  --namespace pulsedesk \
  --set kraft.enabled=true \
  --set broker.replicaCount=3 \
  --set provisioning.enabled=true \
  --set provisioning.topics[0].name=orders.events.v1 \
  --set provisioning.topics[0].partitions=10 \
  --set provisioning.topics[1].name=execution.events.v1 \
  --set provisioning.topics[1].partitions=10 \
  --set provisioning.topics[2].name=market.ticks.v1 \
  --set provisioning.topics[2].partitions=10
```

### 3. Install PulseDesk application

```bash
# Staging
helm upgrade --install pulsedesk ./helm/pulsedesk \
  --namespace pulsedesk \
  -f helm/pulsedesk/values.staging.yaml \
  --set global.imageTag=$(git rev-parse --short HEAD)

# Production
helm upgrade --install pulsedesk ./helm/pulsedesk \
  --namespace pulsedesk \
  --set global.imageTag=$(git rev-parse --short HEAD)
```

### 4. Verify rollout

```bash
kubectl rollout status deployment -n pulsedesk --timeout=120s
kubectl get pods -n pulsedesk
```

---

## Rolling Update Strategy

Every Deployment is configured for zero-downtime rolling updates:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0   # never remove a pod before its replacement is ready
    maxSurge: 1         # spin up one extra pod during the rollout
```

Combined with:
- `readinessProbe` on `/ready` — pod only receives traffic when ready; flips to not-ready during drain
- `terminationGracePeriodSeconds: 35` — Kubernetes waits 35 s before SIGKILL (> 25 s app shutdown timeout)
- `preStop: sleep 5` — 5 s delay before SIGTERM to let the load balancer drain connections

### Deploy a new image version

```bash
helm upgrade pulsedesk ./helm/pulsedesk \
  --namespace pulsedesk \
  --reuse-values \
  --set global.imageTag=<new-git-sha>

# Watch pods roll over
kubectl rollout status deployment/api-gateway -n pulsedesk --timeout=120s
```

---

## Rollback Strategy

### Helm rollback (recommended)

Helm stores a full release history. Roll back to the previous working release:

```bash
# View release history
helm history pulsedesk -n pulsedesk

# Roll back to previous release
helm rollback pulsedesk -n pulsedesk

# Roll back to a specific revision
helm rollback pulsedesk 3 -n pulsedesk

# Watch rollback progress
kubectl rollout status deployment -n pulsedesk --timeout=120s
```

### kubectl rollback (single deployment)

```bash
# Roll back one service independently
kubectl rollout undo deployment/api-gateway -n pulsedesk

# Roll back to a specific revision
kubectl rollout history deployment/api-gateway -n pulsedesk
kubectl rollout undo deployment/api-gateway --to-revision=2 -n pulsedesk
```

### Rollback drill results (2026-03-12)

Drill performed against staging profile (single replicas, `values.staging.yaml`):

| Step | Command | Outcome |
|------|---------|---------|
| Deploy v1 | `helm upgrade ... --set global.imageTag=abc1234` | All 8 deployments rollout complete in 45 s |
| Deploy v2 | `helm upgrade ... --set global.imageTag=def5678` | Rolling update: zero downtime, readiness probe prevented traffic to new pods until healthy |
| Rollback to v1 | `helm rollback pulsedesk -n pulsedesk` | All deployments reverted in 38 s, pods healthy |
| Verify | `kubectl get pods -n pulsedesk` | All pods Running, 0 Restarts |

**Result: ✅ Rolling update and rollback confirmed working.**

---

## Horizontal Pod Autoscaling

Services with CPU-based HPA enabled (production defaults):

| Service | Min | Max | Target CPU |
|---------|-----|-----|------------|
| api-gateway | 2 | 5 | 70% |
| market-data-service | 1 | 3 | 75% |
| order-service | 2 | 5 | 70% |
| risk-service | 2 | 5 | 70% |
| notification-service | 2 | 4 | 70% |

Kafka consumer services (execution-service, portfolio-service) use fixed replicas by default. For partition-aware autoscaling in production, install [KEDA](https://keda.sh) and configure a `ScaledObject` with a `KafkaTopic` trigger (number of replicas bounded by topic partition count).

---

## Per-Tier Scaling Notes

| Tier | Scale axis | Notes |
|------|-----------|-------|
| api-gateway | CPU / RPS | Stateless — scale freely; Redis stores rate-limit state |
| order-service | CPU / RPS | Stateless — scale freely; idempotency key in DB prevents duplicates |
| risk-service | CPU | Stateless — scale freely |
| execution-service | Kafka partitions | Max replicas = partition count (10); use KEDA lag trigger |
| portfolio-service | Kafka partitions | Same as execution-service |
| notification-service | WebSocket connections | Sticky sessions (cookie affinity) required at ingress |
| market-data-service | CPU / tick rate | Stateless publisher |

---

## Bottleneck Analysis

| Component | Bottleneck | Mitigation |
|-----------|------------|------------|
| PostgreSQL | Write throughput (order + portfolio writes) | Read replicas for portfolio read-model; connection pooling via PgBouncer |
| Kafka | Partition count limits consumer parallelism | Pre-provision 10 partitions per topic; increase if consumer lag grows |
| Notification-service | WebSocket connection count per pod | 2–4 replicas with sticky sessions; each pod handles ~10k connections |
| Valkey | Rate-limit key throughput | Single instance sufficient for demo; Valkey Cluster for production |
