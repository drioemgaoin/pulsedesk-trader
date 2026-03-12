# PulseDesk On-Call Diagnostic Checklist

**Use this when paged.** Work top-to-bottom. Each section links to the full runbook.
**Dashboards:** http://localhost:3001 (local/staging) · See `docs/deployment-guide.md` for production URLs.
**Full runbook:** `docs/runbook/observability-runbook.md`

---

## 1. Triage — First 2 minutes

```bash
# What is down?
docker compose ps                         # all containers running?
curl -sf http://localhost:3000/health     # gateway healthy?
curl -sf http://localhost:3000/ready      # gateway ready?
```

- Open **[Platform Overview](http://localhost:3001/d/pulsedesk-platform)**
  - HTTP Error Rate panel — which service is spiking?
  - Circuit Breaker State panel — any breaker OPEN (value = 2)?
  - Kafka Consumer Lag panel — any group lagging?

- Open **[SLO Status](http://localhost:3001/d/pulsedesk-slo)**
  - Error budget remaining?
  - Burn rate above 1?

---

## 2. Service health — 3 minutes

```bash
# Check each service health endpoint
for svc in api-gateway:3000 order-service:3012 risk-service:3013 \
           execution-service:3014 portfolio-service:3015 \
           notification-service:3016 market-data-service:3011; do
  echo -n "$svc: "; curl -sf http://localhost:${svc#*:}/health && echo OK || echo FAIL
done

# Quick error log scan
docker compose logs --tail=50 --no-log-prefix 2>&1 | grep -i "error\|fatal\|panic"
```

---

## 3. Scenario checklists

### Broker lag
> Alert: `KafkaConsumerLagHigh` / `KafkaConsumerLagCritical`
> Dashboard: Platform Overview → "Kafka Consumer Lag"

- [ ] Which consumer group is lagging?
  ```bash
  docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 --describe --group <group>
  ```
- [ ] Is the consumer running? `docker compose ps <service>`
- [ ] Are there handler errors? `docker compose logs <service> --tail=100`
- [ ] Recovery: restart the consumer → verify lag decreasing
- [ ] Full runbook: [#broker-lag](observability-runbook.md#broker-lag)

---

### DB saturation
> Alert: `AvailabilityBurnRateFast` on order-service or portfolio-service + `connection pool` in logs
> Dashboard: Service Drilldown → select affected service → Error Rate

- [ ] Which service has pool errors?
  ```bash
  docker compose logs order-service portfolio-service --tail=100 | grep -i pool
  ```
- [ ] How many active DB connections?
  ```bash
  docker compose exec postgres psql -U pulsedesk -d pulsedesk -c \
    "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
  ```
- [ ] Any long-running queries? (see runbook for query)
- [ ] Recovery: kill idle-in-transaction connections → restart affected service
- [ ] Full runbook: [#db-saturation](observability-runbook.md#db-saturation)

---

### Gateway overload
> Alert: `AvailabilityBurnRateFast` on api-gateway + 429/503 in access logs
> Dashboard: Platform Overview → "Request Rate" / "In-Flight Requests"

- [ ] Is it rate limiting (429) or load shedding (503)?
  ```bash
  docker compose logs api-gateway --tail=200 | grep -E "load shed|ThrottlerException"
  ```
- [ ] Are downstream services healthy? (check order-service, risk-service health)
- [ ] Is circuit breaker OPEN? (Platform Overview → Circuit Breaker State panel)
- [ ] Recovery: flush rate limit keys in Valkey / restart downstream / scale gateway
- [ ] Full runbook: [#gateway-overload](observability-runbook.md#gateway-overload)

---

### Notification fanout
> Alert: `AvailabilityBurnRateFast` on notification-service or client reports no live updates
> Dashboard: Service Drilldown → notification-service

- [ ] Is notification-service running and healthy?
  ```bash
  curl -sf http://localhost:3016/health
  docker compose logs notification-service --tail=100 | grep -i error
  ```
- [ ] Is its Kafka consumer keeping up?
  ```bash
  docker compose exec kafka /opt/kafka/bin/kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 --describe --group notification-service
  ```
- [ ] Are upstream producers publishing? (check execution-service, market-data-service logs)
- [ ] Recovery: restart notification-service (clients reconnect automatically)
- [ ] Full runbook: [#notification-fanout](observability-runbook.md#notification-fanout)

---

## 4. Key metrics reference

| Metric (Prometheus) | Normal | Warning | Critical |
|---------------------|--------|---------|----------|
| `sli:http_availability:ratio_rate5m` | > 0.999 | < 0.99 | < 0.90 |
| `sli:http_latency_p95_ms:rate5m` | < 100 ms | > 500 ms | > 2 000 ms |
| `sli:http_error_rate:ratio_rate5m` | < 0.01 | > 0.01 | > 0.10 |
| `sli:kafka_consumer_lag:sum_by_group` | < 100 | > 1 000 | > 10 000 |
| `opossum_state` | 0 (closed) | 1 (half-open) | 2 (open) |
| DB `pg_stat_activity` active count | < 10/svc | > 50 | > 90 |

---

## 5. Useful Loki queries

```logql
# All errors in last 15 min
{service_name=~".+"} | json | level="error"

# Errors for a specific service
{service_name="order-service"} | json | level="error"

# Trace a specific request
{service_name=~".+"} | json | traceId="<paste-trace-id>"

# Load shedding events
{service_name="api-gateway"} |= "load shed"

# Kafka poison-pill events
{service_name=~".+"} |= "poison-pill"
```

---

## 6. Escalation

| Severity | SLA | Action |
|----------|-----|--------|
| critical | < 15 min response | Page @devops on-call; open incident channel |
| warning | < 4 hours | Create ticket; assign to @devops |
| info | Next business day | Add to backlog |

**Incident postmortem template:** `docs/adr/` → create new ADR entry for root cause and prevention.
