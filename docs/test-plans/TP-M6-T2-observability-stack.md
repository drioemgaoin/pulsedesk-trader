# Test Plan: M6-T2 — Unified Observability Stack

**Milestone:** M6 — Resilience and Observability
**Task:** T2 — Unified observability stack
**AC under test:**
1. Prometheus, Loki, Tempo, and Grafana are available in compose profile
2. Service dashboards show throughput, latency, error rates, and queue lag
3. Traces link request path across gateway, order, risk, execution, and portfolio services

---

## Test Files

| File | Tests | Scope |
|------|-------|-------|
| `services/api-gateway/src/instrumentation.spec.ts` | 12 | OTel bootstrap source validation |
| `services/api-gateway/src/observability-infra.spec.ts` | 32 | Infra config + dashboard panel coverage |
| **Total** | **44** | |

---

## Coverage by AC

### AC1 — Compose profile has Prometheus, Loki, Tempo, Grafana

Validated by `observability-infra.spec.ts › docker-compose.yml — observability services`:

| Test | Result |
|------|--------|
| Prometheus image present | ✓ |
| Loki image present | ✓ |
| Tempo image present | ✓ |
| Grafana image present | ✓ |
| kafka-exporter present (consumer lag) | ✓ |
| Grafana dashboard provisioning config mounted | ✓ |
| Grafana dashboards directory mounted | ✓ |

### AC2 — Dashboards show throughput, latency, error rates, queue lag

**OTel pipeline wiring** — `instrumentation.spec.ts`:

| Test | Result |
|------|--------|
| OTLPTraceExporter imported + used | ✓ |
| OTLPMetricExporter imported + used | ✓ |
| OTLPLogExporter imported + used | ✓ |
| PeriodicExportingMetricReader (sdk-metrics) | ✓ |
| BatchLogRecordProcessor (sdk-logs) | ✓ |
| `traceExporter:` in NodeSDK config | ✓ |
| `metricReader:` in NodeSDK config | ✓ |
| `logRecordProcessor:` in NodeSDK config | ✓ |
| All 3 endpoints from `OTEL_EXPORTER_OTLP_ENDPOINT` | ✓ |
| Metric export interval = 15s (Prometheus aligned) | ✓ |
| fs instrumentation disabled (noise) | ✓ |
| sdk.start() called | ✓ |

**OTel Collector pipelines** — `observability-infra.spec.ts › otel-collector.yml`:

| Test | Result |
|------|--------|
| traces pipeline → Tempo | ✓ |
| metrics pipeline → Prometheus (port 8889) | ✓ |
| logs pipeline → Loki | ✓ |
| OTLP gRPC (4317) + HTTP (4318) receivers | ✓ |

**Prometheus scraping** — `observability-infra.spec.ts › prometheus.yml`:

| Test | Result |
|------|--------|
| All 7 application services scraped | ✓ |
| otel-collector:8889 scraped | ✓ |
| kafka-exporter:9308 scraped | ✓ |

**Platform dashboard panels** — `observability-infra.spec.ts › pulsedesk-platform.json dashboard`:

| Panel | Metric | Result |
|-------|--------|--------|
| Throughput (req/s) | `http_server_duration_milliseconds_count` + `rate()` | ✓ |
| HTTP Error Rate (%) | `http_status_code=~"5.."` | ✓ |
| p95 Latency | `histogram_quantile(0.95, http_server_duration_milliseconds_bucket)` | ✓ |
| Kafka Consumer Lag | `kafka_consumergroup_lag` | ✓ |
| Service Availability (SLO 99.9%) | stat panel | ✓ |
| Active Traces text panel | trace path description | ✓ |

**Service drilldown dashboard** — `observability-infra.spec.ts › pulsedesk-service-drilldown.json`:

| Panel | Result |
|-------|--------|
| Latency p50/p95/p99 percentiles | ✓ |
| Loki logs panel (ERROR/WARN filter) | ✓ |
| Tempo traces panel | ✓ |

### AC3 — Traces link request path across services

Trace linkage is achieved at two levels:

1. **Auto-instrumentation** (`@opentelemetry/auto-instrumentations-node` in all 7 services): HTTP spans, Fastify, Kafkajs, and pino are all instrumented automatically — no manual span code required.

2. **W3C `traceparent` propagation**: `proxy.service.ts` forwards `traceparent` header downstream (`api-gateway → order-service → risk-service → ...`), ensuring all downstream spans share the same trace ID.

3. **Tempo → Loki correlation**: Grafana datasource config (`infrastructure/grafana/datasources.yml`) has `tracesToLogs` linkage enabled with `traceIdLabelName: traceId` — clicking any Tempo span opens the correlated Loki log stream.

These properties are validated structurally (source-level and config-level) rather than via live integration tests. Live trace validation is covered in T4 (failure scenario validation).

---

## Test run summary

```
PASS src/instrumentation.spec.ts
PASS src/observability-infra.spec.ts

Test Suites: 2 passed, 2 total
Tests:       44 passed, 44 total
Date:        2026-03-11
```

---

## Known gaps / T3 scope

- SLO alert rules (Prometheus alerting rules) are not yet defined — deferred to T3
- Dashboard refresh/auto-provisioning on live Grafana requires `docker compose up` to confirm; not tested here
- Kafka consumer group names in `kafka_consumergroup_lag` depend on runtime consumer configuration

---

## Runbook references

| Signal | Where to inspect |
|--------|-----------------|
| Throughput / error rate | Grafana → Platform Overview → top row panels |
| Latency p95 | Grafana → Platform Overview → middle row |
| Consumer lag | Grafana → Platform Overview → Kafka Consumer Lag panel |
| Trace for a specific request | Grafana Explore → Tempo → filter by `service.name` + time range |
| Logs correlated to a trace | Click span in Tempo → "Related logs" → opens Loki |
| Circuit breaker state | Grafana → Platform Overview → Circuit Breaker State panel |
| Load shedding events | Grafana → Platform Overview → Load Shedding Events panel |
