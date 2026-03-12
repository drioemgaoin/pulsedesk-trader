# PulseDesk Observability Runbook

**Stack:** Prometheus · Grafana · Loki · Tempo · kafka-exporter
**Dashboards:** http://localhost:3001 (local dev)
**Alert rules:** `infrastructure/prometheus-rules.yml`

---

## SLO Reference

| SLI | SLO Target | Alert (warn) | Alert (critical) |
|-----|-----------|--------------|-----------------|
| Availability | 99.9% | error rate >1% for 30m | error rate >10% for 5m |
| Latency p95 | < 500 ms | p95 > 500 ms for 5m | p95 > 2 000 ms for 2m |
| Error rate | < 1% | — (covered by availability slow burn) | — |
| Kafka consumer lag | < 1 000 msgs | lag > 1 000 for 5m | lag > 10 000 for 2m |

Monthly error budget (availability 99.9%): **43.8 minutes** of allowed downtime.

---

## Alert Runbooks

### `AvailabilityBurnRateFast` — error rate >10% for 5 min {#availability-fast-burn}

**Severity:** critical · **SLO impact:** exhausts monthly budget in ~7 hours

**Where to inspect:**
1. **Grafana** → [Platform Overview](http://localhost:3001/d/pulsedesk-platform) → HTTP Error Rate panel — identify which service is spiking
2. **Grafana** → [Service Drilldown](http://localhost:3001/d/pulsedesk-service-drilldown) → select the offending service → "Request Rate by Status" panel → identify which status codes
3. **Loki logs** → Grafana Explore → datasource: Loki → query: `{service_name="<service>"} | json | level="error"`
4. **Tempo traces** → Grafana Explore → datasource: Tempo → filter by `service.name=<service>` and `http.status_code=~5..` to find failing trace spans

**Common causes and remediation:**

| Cause | Signal | Action |
|-------|--------|--------|
| Downstream dependency down | Circuit breaker OPEN panel shows `2` | Check `risk-service` / `order-service` health; wait for CB reset (10s) or restart dependency |
| Database connection pool exhausted | Loki logs: `connection pool exhausted` | Restart affected service; check Prisma pool config |
| OOM / crash loop | `ServiceDown` alert also firing | `docker compose logs <service> --tail=100` |
| Deployment bad code push | Error rate starts at a specific timestamp | Roll back deployment |

---

### `AvailabilityBurnRateSlow` — error rate >1% sustained 30 min {#availability-slow-burn}

**Severity:** warning · **SLO impact:** exhausts monthly budget in ~3 days

**Where to inspect:**
1. [SLO Status dashboard](http://localhost:3001/d/pulsedesk-slo) → "Error Burn Rate" panel — confirm 30m window is elevated
2. [Service Drilldown](http://localhost:3001/d/pulsedesk-service-drilldown) → Logs panel → look for recurring errors
3. Prometheus → `sli:http_error_rate:ratio_rate5m{service_name="<service>"}` — check per-endpoint breakdown

**Common causes:** intermittent upstream timeouts, traffic spike above circuit-breaker capacity, misconfigured retry amplification.

**Action:** Create ticket; investigate root cause before error budget drops below 50%.

---

### `ServiceDown` — scrape target unreachable for 1 min {#service-down}

**Severity:** critical

**Where to inspect:**
1. Prometheus → http://localhost:9090/targets — check `State` column for the affected job
2. `docker compose ps` — confirm container is running
3. `docker compose logs <service> --tail=50` — look for startup failure or crash

**Remediation:**
```bash
docker compose restart <service>
# or if image issue:
docker compose up -d --force-recreate <service>
```

---

### `LatencyP95High` — p95 >500 ms for 5 min {#latency-p95}

**Severity:** warning

**Where to inspect:**
1. [Service Drilldown](http://localhost:3001/d/pulsedesk-service-drilldown) → "Latency Percentiles" panel — confirm p50 is also elevated (systemic) vs only p99 (outlier)
2. **Tempo traces** → Grafana Explore → Tempo → filter by `service.name` → sort by duration descending — identify slowest span
3. Check upstream dependency latency: `sli:http_latency_p95_ms:rate5m{service_name="risk-service"}` — if risk-service is slow, order-service p95 will follow

**Common causes:** database slow query, GC pause, cold start after scaling, external API degradation.

---

### `LatencyP95Critical` — p95 >2 000 ms for 2 min {#latency-p95-critical}

**Severity:** critical

At this latency, `api-gateway` circuit breakers (Order: 5s, Portfolio: 3s, Risk: 2s) are close to or already tripping. Check circuit breaker state immediately.

**Where to inspect:**
1. [Platform Overview](http://localhost:3001/d/pulsedesk-platform) → "Circuit Breaker State" panel
2. Prometheus → `opossum_state` metric — `2` = OPEN
3. Loki → `{service_name="api-gateway"} |= "circuit"` — look for OPEN events

---

### `KafkaConsumerLagHigh` — lag >1 000 for 5 min {#kafka-consumer-lag}

**Severity:** warning · **SLO impact:** event processing delay

**Where to inspect:**
1. [Platform Overview](http://localhost:3001/d/pulsedesk-platform) → "Kafka Consumer Lag" panel — identify which `consumergroup` / `topic` pair
2. Prometheus → `sli:kafka_consumer_lag:sum_by_group` — confirm which groups are affected
3. `docker compose logs <consumer-service> --tail=100` — look for processing errors or slow handler logs

**Consumer group → service mapping:**

| Consumer group | Service | Topics consumed |
|----------------|---------|----------------|
| `order-service` | order-service | — |
| `execution-service` | execution-service | orders, risk-evaluation |
| `portfolio-service` | portfolio-service | executions, portfolio-updates |
| `notification-service` | notification-service | market-data |

**Common causes:** slow message handler (CPU-bound processing), downstream DB latency, consumer crash (check `ServiceDown` alert), sudden producer spike.

**Remediation:** Investigate consumer logs first. If processing is slow, check DB query times and downstream dependencies. If crashed, restart consumer service.

---

### `KafkaConsumerLagCritical` — lag >10 000 for 2 min {#kafka-consumer-lag-critical}

**Severity:** critical

Consumer is likely stalled. Messages are accumulating and portfolio/execution state is falling behind real time.

**Immediate actions:**
```bash
# Check if consumer is running
docker compose ps <consumer-service>
# Force restart
docker compose restart <consumer-service>
# Inspect offset position
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --group <consumer-group>
```

---

### `CircuitBreakerOpen` — breaker OPEN for >1 min {#circuit-breaker-open}

**Severity:** warning

**Where to inspect:**
1. [Platform Overview](http://localhost:3001/d/pulsedesk-platform) → "Circuit Breaker State" panel — `name` label shows which upstream (Order, Portfolio, Risk)
2. Loki → `{service_name="api-gateway"} |= "OPEN"` — timestamp of when it opened
3. Check the corresponding upstream service using `ServiceDown` alert + service drilldown

**Breaker configuration (from DESIGN-M6-T1):**

| Upstream | Timeout | Reset | Capacity |
|----------|---------|-------|----------|
| order-service | 5 s | 10 s | 100 |
| portfolio-service | 3 s | 10 s | 50 |
| risk-service | 2 s | 10 s | 30 |

Circuit will move to HALF-OPEN after `resetTimeout` and let one probe request through. If the probe succeeds, breaker closes automatically. No manual intervention needed unless the upstream remains down.

---

## Inspecting Signals

### Traces for a specific request

1. Extract `x-request-id` from response headers (gateway echoes it)
2. Grafana Explore → Tempo → paste trace ID or search by `service.name` + time range
3. Expand span tree to see the full `api-gateway → order-service → risk-service` call chain
4. Click any span → "Related logs" → opens Loki filtered by `traceId`

### Querying logs directly

```logql
# All errors from a service in the last 15 min
{service_name="order-service"} | json | level="error"

# Logs for a specific trace ID
{service_name=~".+"} | json | traceId="<trace-id>"

# Load shedding events on gateway
{service_name="api-gateway"} |= "overloaded"
```

### Querying metrics directly (Prometheus)

```promql
# Current availability per service
sli:http_availability:ratio_rate5m

# p95 latency per service
sli:http_latency_p95_ms:rate5m

# Kafka lag per consumer group
sli:kafka_consumer_lag:sum_by_group

# Circuit breaker state (0=closed, 1=half-open, 2=open)
opossum_state
```

---

## Reloading Alert Rules

After editing `infrastructure/prometheus-rules.yml`:

```bash
# Hot-reload without restart (--web.enable-lifecycle is set in compose)
curl -X POST http://localhost:9090/-/reload
```

---

## Escalation

| Severity | Response time | Owner |
|----------|--------------|-------|
| critical | < 15 min | @devops on-call |
| warning | < 4 hours | @devops |
| info | Next business day | @dev team |
