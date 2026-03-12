# Test Plan: M6-T3 — Alert-Ready SLI/SLO Instrumentation

**Milestone:** M6 — Resilience and Observability
**Task:** T3 — Alert-ready SLI/SLO instrumentation
**AC under test:**
1. Core SLIs (availability, latency, error rate, event lag) are defined and measured
2. SLO targets are encoded in dashboard panels/alert rules for staging profile
3. Runbook references include where to inspect each signal

---

## Test File

| File | Tests | Scope |
|------|-------|-------|
| `services/api-gateway/src/slo-infra.spec.ts` | 58 | Rules, alerts, dashboard, runbook |

---

## Coverage by AC

### AC1 — Core SLIs defined and measured

`prometheus-rules.yml — recording rules` (6 tests):

| SLI | Recording rule | Window | Result |
|-----|---------------|--------|--------|
| Availability | `sli:http_availability:ratio_rate5m` | 5m | ✓ |
| Availability (slow-burn) | `sli:http_availability:ratio_rate30m` | 30m | ✓ |
| Error rate | `sli:http_error_rate:ratio_rate5m` | 5m | ✓ |
| Latency p95 | `sli:http_latency_p95_ms:rate5m` | 5m | ✓ |
| Event lag | `sli:kafka_consumer_lag:sum_by_group` | live | ✓ |
| Evaluation interval | 30s (Prometheus-aligned) | — | ✓ |

### AC2 — SLO targets encoded in alert rules and dashboard

**Alert rules** (17 tests across 4 groups):

| Alert | Threshold | Severity | `for` | Result |
|-------|-----------|----------|-------|--------|
| `AvailabilityBurnRateFast` | error rate >10% | critical | 5m | ✓ |
| `AvailabilityBurnRateSlow` | error rate >1% | warning | 30m | ✓ |
| `ServiceDown` | `up == 0` (all 7 services) | critical | 1m | ✓ |
| `LatencyP95High` | p95 >500ms | warning | 5m | ✓ |
| `LatencyP95Critical` | p95 >2000ms | critical | 2m | ✓ |
| `KafkaConsumerLagHigh` | lag >1 000 | warning | 5m | ✓ |
| `KafkaConsumerLagCritical` | lag >10 000 | critical | 2m | ✓ |
| `CircuitBreakerOpen` | `opossum_state == 2` | warning | 1m | ✓ |

**Alert annotations** (16 tests — every alert verified for `runbook:` + `dashboard:` annotations):
All 8 alerts carry both annotations → ✓

**Infra wiring** (4 tests):
- `prometheus.yml` has `rule_files:` directive → ✓
- `docker-compose.yml` mounts rules file into Prometheus → ✓
- `--web.enable-lifecycle` flag enables hot-reload → ✓

**SLO dashboard** (8 tests — `pulsedesk-slo.json`):

| Panel | SLI referenced | Result |
|-------|---------------|--------|
| Availability stat (target 99.9%) | `sli:http_availability` | ✓ |
| p95 Latency stat (target <500ms) | `sli:http_latency_p95_ms` | ✓ |
| Error rate stat (target <1%) | `sli:http_error_rate` | ✓ |
| Kafka lag stat (target <1000) | `sli:kafka_consumer_lag` | ✓ |
| Error burn rate timeseries (5m+30m, threshold lines at 10%/1%) | recording rules | ✓ |
| Active alerts panel | Prometheus alertmanager | ✓ |
| Error budget gauge | availability SLO | ✓ |

### AC3 — Runbook references for each signal

`observability-runbook.md — alert section coverage` (13 tests):

| Section | Anchor | Result |
|---------|--------|--------|
| `AvailabilityBurnRateFast` | `#availability-fast-burn` | ✓ |
| `AvailabilityBurnRateSlow` | `#availability-slow-burn` | ✓ |
| `ServiceDown` | `#service-down` | ✓ |
| `LatencyP95High` | `#latency-p95` | ✓ |
| `LatencyP95Critical` | `#latency-p95-critical` | ✓ |
| `KafkaConsumerLagHigh` | `#kafka-consumer-lag` | ✓ |
| `KafkaConsumerLagCritical` | `#kafka-consumer-lag-critical` | ✓ |
| `CircuitBreakerOpen` | `#circuit-breaker-open` | ✓ |
| SLO reference table (all 4 SLIs) | — | ✓ |
| PromQL query examples | — | ✓ |
| Loki LogQL examples | — | ✓ |
| Hot-reload instructions (`/-/reload`) | — | ✓ |
| Escalation table | — | ✓ |

---

## Test run summary

```
PASS src/slo-infra.spec.ts

Test Suites:  1 passed,   1 total
Tests:       58 passed,  58 total
Full suite:  157 passed, 157 total  (15 suites, 0 regressions)
Date:        2026-03-12
```
