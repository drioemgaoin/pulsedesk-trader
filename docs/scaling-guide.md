# PulseDesk Scaling Guide

**Milestone:** M7-T3
**Profile:** Local Docker Compose (staging-like)

---

## Tier Scaling Summary

| Service | Scalable? | Max useful replicas | Constraint |
|---|---|---|---|
| `risk-service` | ✅ Yes | Unlimited | Stateless HTTP; DNS round-robin |
| `execution-service` | ✅ Yes | 10 | Kafka partitions = 10 per topic |
| `portfolio-service` | ✅ Yes | 10 | Kafka partitions = 10 per topic |
| `order-service` | ✅ Yes (with care) | 10 | Shared PostgreSQL; idempotency key prevents double-writes |
| `api-gateway` | ✅ Yes (via nginx) | Unlimited | nginx round-robin in `docker-compose.scale.yml`; port `3000` owned by nginx |
| `notification-service` | ✅ Yes (via nginx) | ~50 | nginx `ip_hash` sticky sessions; port `3016` owned by nginx |
| `market-data-service` | ❌ Singleton | 1 | Idempotent producer still publishes duplicate ticks if scaled |

---

## Scaling Each Tier

### risk-service — Stateless HTTP

**Scale command:**
```bash
docker compose up -d --scale risk-service=2
```

**How it works:** `order-service` calls `http://risk-service:3013` — Docker DNS resolves to all healthy replicas and distributes connections. No session state. Partition rebalance not applicable.

**Observed behaviour (drill 2026-03-12):**
- Replica 2 healthy within 7 s of start
- No service disruption to in-flight requests
- Scale-down: replica removed within 11 s (SIGTERM → 30 s grace, actual drain < 1 s)

**Optimal replicas:** 2 covers single-instance failure; add replicas to scale risk validation throughput linearly.

---

### execution-service — Kafka Consumer (orders.events.v1, market.ticks.v1)

**Scale command:**
```bash
docker compose up -d --scale execution-service=2
```

**How it works:** Both instances join consumer groups `execution-service` and `execution-market-prices`. Kafka rebalances partitions across all group members. With 10 partitions and 2 replicas, each replica processes 5 partitions.

**Observed behaviour:**
- Replica 2 healthy within 10 s
- Kafka triggers rebalance for both consumer groups on join and on leave
- Rebalance pauses consumption briefly (~1–3 s) during partition reassignment

**Partition math:**
```
10 partitions ÷ 2 replicas = 5 partitions/replica
10 partitions ÷ 10 replicas = 1 partition/replica  (max parallelism)
>10 replicas = idle replicas (no partitions to assign)
```

**Optimal replicas:** Match replica count to expected partition lag. Start at 2; increase if consumer lag grows during market hours. Cap at 10.

---

### portfolio-service — Kafka Consumer (execution.events.v1, market.ticks.v1)

**Scale command:**
```bash
docker compose up -d --scale portfolio-service=2
```

Same Kafka rebalancing behaviour as execution-service. Consumer groups: `portfolio-service` and `portfolio-market-prices`.

**Optimal replicas:** 2–4. Portfolio updates are latency-tolerant (no synchronous path); prioritise execution-service scaling first.

---

### order-service — DB-backed Command Handler + Kafka Consumer

**Scale command:**
```bash
docker compose up -d --scale order-service=2
```

**How it works:**
- HTTP: api-gateway calls `http://order-service:3012` — DNS round-robin
- DB: Both replicas share the same PostgreSQL instance. `idempotencyKey` (unique constraint) prevents duplicate order writes under concurrent submission of the same command
- Kafka: Consumer group `order-execution-updates` rebalances across replicas

**Observed behaviour:**
- Replica 2 healthy within 10 s
- No duplicate order writes observed (idempotency key enforced at DB level)

**Bottleneck:** PostgreSQL connection pool. With 2 replicas, each holding a connection pool, ensure `PG_MAX_CONNECTIONS` headroom. Default NestJS TypeORM pool is 10 connections/instance.

**Optimal replicas:** 2 for failover; 3–4 for sustained order burst. Monitor `pg_stat_activity` connection count.

---

### api-gateway — nginx round-robin load balancer

**Scale command (via overlay):**
```bash
docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

**How it works:** `docker-compose.scale.yml` suppresses the static `3000:3000` host port on `api-gateway` and adds an `nginx` service that owns `:3000`. nginx proxies upstream to `api-gateway:3000` (Docker DNS resolves to all healthy replicas, round-robin). Config: `infrastructure/nginx/scale.conf`.

**Observed behaviour (drill 2026-03-12):**
- nginx starts cleanly; api-gateway replicas registered as upstream
- Host port conflict eliminated — 3 replicas start without error
- Requests distributed across all replicas (verified via access log)

**Optimal replicas:** 3 — gateway is CPU-bound on JWT verification and proxy I/O; each replica adds ~500 req/s capacity at p95 <100 ms.

---

### notification-service — nginx ip_hash sticky sessions

**Scale command (via overlay):**
```bash
docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

**How it works:** `docker-compose.scale.yml` suppresses the static `3016:3016` host port and adds nginx owning `:3016`. nginx uses `ip_hash` so the same client IP always routes to the same replica, keeping WebSocket connections alive across requests. Config: `infrastructure/nginx/scale.conf`.

**Observed behaviour (drill 2026-03-12):**
- nginx starts cleanly; notification-service replicas registered as upstream
- Host port conflict eliminated — 2 replicas start without error
- WebSocket upgrade headers (`Upgrade`, `Connection`) forwarded correctly

**Optimal replicas:** 2 with sticky sessions — one replica handles ~10 000 concurrent WebSocket connections at comfortable memory headroom.

---

### market-data-service — Singleton Producer

**Must remain a single instance.** The idempotent Kafka producer avoids duplicates _within_ a single producer instance, but two separate producer instances publishing the same symbol tick would result in duplicate events on `market.ticks.v1` — downstream consumers would process the same tick twice, corrupting portfolio P&L calculations.

**Scaling approach for market data:** Increase the tick publish interval or use a dedicated market data fan-out architecture (single producer → multiple consumer groups) rather than replica scaling.

---

## Kafka Partition Scaling Boundary

All Kafka-consumer services are bounded by topic partition count (10). Adding more than 10 replicas to any single consumer group yields idle replicas:

```
consumers ≤ partitions  → all consumers active
consumers > partitions  → (consumers - partitions) replicas idle
```

To scale beyond 10 consumers per topic, increase `KAFKA_NUM_PARTITIONS` and recreate topics. **This is a destructive operation** — requires consumer group offset reset.

---

## Resource Recommendations (per replica, local Docker)

| Service | CPU | Memory |
|---|---|---|
| api-gateway | 0.5 vCPU | 256 MB |
| order-service | 0.5 vCPU | 256 MB |
| execution-service | 0.25 vCPU | 128 MB |
| portfolio-service | 0.25 vCPU | 128 MB |
| risk-service | 0.25 vCPU | 128 MB |
| notification-service | 0.5 vCPU | 512 MB (WebSocket state) |
| market-data-service | 0.25 vCPU | 128 MB |

---

## Drill Results

| Service | Replicas tested | Date | Result |
|---|---|---|---|
| risk-service | 1 → 2 → 1 | 2026-03-12 | ✅ Zero disruption, healthy in 7 s |
| execution-service | 1 → 2 → 1 | 2026-03-12 | ✅ Kafka rebalance ~2 s, healthy in 10 s |
| portfolio-service | 1 → 2 → 1 | 2026-03-12 | ✅ Kafka rebalance ~2 s, healthy in 10 s |
| order-service | 1 → 2 → 1 | 2026-03-12 | ✅ No duplicate writes, healthy in 10 s |
| api-gateway | 3 → 1 → 3 (via nginx) | 2026-03-12 | ✅ nginx routes during scale transition (200 OK), replicas healthy in ~10 s |
| notification-service | 1 → 2 (via nginx) | 2026-03-12 | ✅ Both replicas healthy, nginx ip_hash sticky, WebSocket upgrade forwarded |
| market-data-service | singleton | 2026-03-12 | ✅ (by design) — dual producers would corrupt P&L |

**Note:** `execution-service` and `portfolio-service` required a fix before the full nginx drill run: `KafkaMarketTickConsumer` was missing `@Inject(MARKET_PRICE_CACHE)` on its constructor parameter, causing NestJS DI to fail to resolve `IMarketPriceCache` (a TypeScript interface, erased at runtime). Fixed in `services/execution-service/src/infrastructure/messaging/kafka-market-tick-consumer.ts` and the equivalent portfolio-service file.
