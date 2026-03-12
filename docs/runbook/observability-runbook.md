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

---

## Incident Runbooks

### Broker Lag — Kafka producer backpressure or partition saturation {#broker-lag}

**Symptoms:** `KafkaConsumerLagHigh` / `KafkaConsumerLagCritical` alerts firing; order acknowledgement latency rising; portfolio/execution state falling behind real-time.

**Step 1 — Identify the lagging group and topic**
```bash
# Inspect all consumer group offsets
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --list

docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --group <consumer-group>
# LAG column shows per-partition lag
```

**Step 2 — Check producer throughput**
```promql
# Messages produced per second per topic
rate(kafka_topic_partition_current_offset[1m])
```

**Step 3 — Diagnose cause**

| Signal | Cause | Action |
|--------|-------|--------|
| Lag growing, consumer healthy | Producer spike above processing capacity | Scale consumer replicas (bounded by partition count = 10) |
| Lag growing, consumer errors in logs | Slow/failing message handler | Check `docker compose logs <service> --tail=100` for errors; fix handler or reduce batch size |
| Lag static but non-zero | Consumer caught up but offset not committed | Check `autoCommit: false` consumers — they commit after processing; restart consumer |
| Lag on all groups simultaneously | Broker overloaded | Check broker CPU/disk: `docker compose stats kafka`; restart broker if needed |

**Recovery procedure (staging tested 2026-03-12):**
```bash
# 1. Identify stalled consumer
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group execution-service

# 2. Restart consumer service
docker compose restart execution-service

# 3. Confirm lag decreasing within 30 s
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group execution-service
# LAG column should be decreasing
```

---

### DB Saturation — PostgreSQL connection pool exhaustion or slow queries {#db-saturation}

**Symptoms:** Services returning 500 with `connection pool exhausted` in logs; order submission latency spike; `AvailabilityBurnRateFast` for order-service or portfolio-service.

**Step 1 — Identify the saturated service**
```bash
# Look for connection errors
docker compose logs order-service --tail=100 | grep -i "pool\|connect\|timeout"
docker compose logs portfolio-service --tail=100 | grep -i "pool\|connect\|timeout"
```

**Step 2 — Check active connections**
```bash
docker compose exec postgres psql -U pulsedesk -d pulsedesk -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
# 'active' count approaching max_connections (100 default) = saturation
```

**Step 3 — Identify slow queries**
```bash
docker compose exec postgres psql -U pulsedesk -d pulsedesk -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';"
```

**Step 4 — Diagnose cause**

| Signal | Cause | Action |
|--------|-------|--------|
| Many `idle in transaction` connections | Service crashed mid-transaction; connections not returned | Restart the affected service |
| Long-running queries present | Missing index or N+1 query | `EXPLAIN ANALYZE` the slow query; add index |
| `max_connections` reached | Too many service replicas sharing one DB | Reduce replicas or add PgBouncer connection pooler |
| Disk I/O high | Table bloat / missing vacuum | `VACUUM ANALYZE <table>` |

**Recovery procedure (staging tested 2026-03-12):**
```bash
# 1. Kill idle connections blocking pool
docker compose exec postgres psql -U pulsedesk -d pulsedesk -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
   AND query_start < now() - interval '60 seconds';"

# 2. Restart the affected service to recycle its connection pool
docker compose restart order-service

# 3. Verify connections recover
docker compose exec postgres psql -U pulsedesk -d pulsedesk -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
# active count should drop to normal operating level (< 10 per service)
```

---

### Gateway Overload — Rate limiting, load shedding, or in-flight saturation {#gateway-overload}

**Symptoms:** Clients receiving 429 (rate limited) or 503 (load shed); `AvailabilityBurnRateFast` on api-gateway; Grafana shows high in-flight request count.

**Step 1 — Identify the overload type**
```bash
# Load shedding events (in-flight threshold exceeded)
docker compose logs api-gateway --tail=200 | grep "load shed"

# Rate limit events (per-user quota)
docker compose logs api-gateway --tail=200 | grep "ThrottlerException\|rate limit"
```

**Step 2 — Check key metrics**
```promql
# In-flight requests on gateway
sum(http_server_active_requests{service_name="api-gateway"})

# Request rate per second
rate(http_server_duration_milliseconds_count{service_name="api-gateway"}[1m])

# 429 rate (rate-limited clients)
rate(http_server_duration_milliseconds_count{service_name="api-gateway",http_status_code="429"}[1m])
```

**Step 3 — Diagnose cause**

| Signal | Cause | Action |
|--------|-------|--------|
| High 429 rate, legitimate traffic | Rate limit too low for current load | Raise `GATEWAY_RATE_LIMIT_MAX` env var and restart gateway |
| High 503 rate with "load shed" in logs | Downstream services slow, in-flight queue full | Check downstream health (`order-service`, `risk-service`); circuit breaker state |
| Both 429 and 503 | Traffic spike + slow downstreams | Scale gateway replicas; scale downstream services |
| 503 with circuit breaker OPEN | Upstream dependency failure | See `CircuitBreakerOpen` runbook above |

**Recovery procedure (staging tested 2026-03-12):**
```bash
# Check load shedding threshold (default: 0 = disabled unless GATEWAY_MAX_IN_FLIGHT set)
docker compose exec api-gateway env | grep IN_FLIGHT

# Check Valkey rate limit store
docker compose exec valkey valkey-cli keys "throttle:*" | head -20

# Flush rate limit keys for a specific user if incorrectly throttled
docker compose exec valkey valkey-cli del "throttle:<user-id>"

# Scale gateway if sustained overload (docker compose profile)
docker compose up -d --scale api-gateway=2  # requires nginx overlay — see docker-compose.scale.yml
```

**Dashboard:** [Platform Overview](http://localhost:3001/d/pulsedesk-platform) → "Request Rate" and "In-Flight Requests" panels.

---

### Notification Fanout — WebSocket connection drops or fanout stalls {#notification-fanout}

**Symptoms:** Clients not receiving real-time updates; WebSocket connections dropping; notification-service CPU/memory spike.

**Step 1 — Check notification service health**
```bash
docker compose logs notification-service --tail=200 | grep -i "error\|disconnect\|fanout"

# Active WebSocket connections
curl -s http://localhost:3016/metrics | grep websocket_connections
```

**Step 2 — Check Kafka consumer health (notification feeds from Kafka)**
```bash
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe --group notification-service
# If LAG is growing, notification service is not consuming fast enough
```

**Step 3 — Diagnose cause**

| Signal | Cause | Action |
|--------|-------|--------|
| Many `disconnect` events in logs | Client network issues or idle timeout | Check client reconnect logic; adjust `pingInterval` |
| Fanout lag (Kafka lag growing) | Notification service CPU-bound on large subscriber list | Scale notification replicas (sticky session required at ingress) |
| Memory growing unboundedly | Connection leak — closed sockets not cleaned up | Restart notification-service; investigate socket lifecycle |
| No messages flowing | Kafka topic empty (upstream event not produced) | Trace back to producing service (execution-service, market-data-service) |

**Recovery procedure (staging tested 2026-03-12):**
```bash
# 1. Check connection count and subscription state
docker compose logs notification-service --tail=100 | grep -E "connected|subscribed|disconnect"

# 2. Restart notification service (clients auto-reconnect via RxJS reconnect logic in UI)
docker compose restart notification-service

# 3. Confirm Kafka lag clears after restart
docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group notification-service

# 4. Verify client reconnection in browser DevTools → Network → WS
```

**Sticky sessions note:** In Kubernetes, WebSocket connections are sticky via ingress cookie affinity. Restarting one pod does not affect connections on other pods. Clients connected to the restarted pod will reconnect automatically.

**Dashboard:** [Service Drilldown](http://localhost:3001/d/pulsedesk-service-drilldown) → select `notification-service` → "Request Rate" and "Error Rate" panels.

---

## Escalation

| Severity | Response time | Owner |
|----------|--------------|-------|
| critical | < 15 min | @devops on-call |
| warning | < 4 hours | @devops |
| info | Next business day | @dev team |
