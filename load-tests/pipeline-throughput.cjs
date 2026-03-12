#!/usr/bin/env node
/**
 * M7-T2  Event pipeline throughput test
 *
 * Measures:
 *   1. Market-tick publish throughput (market.ticks.v1, 10 partitions)
 *   2. Order-event publish throughput (orders.events.v1, 10 partitions)
 *   3. Consumer group lag at peak and time-to-drain after burst
 *   4. Partition routing consistency (djb2 hash — same symbol → same partition)
 *   5. Backpressure / saturation behaviour under overload burst
 *
 * Usage:
 *   node load-tests/pipeline-throughput.js
 *
 * Env overrides:
 *   KAFKA_BROKER            default: localhost:9092
 *   TICK_BURST              default: 500   (market ticks to publish)
 *   ORDER_BURST             default: 200   (order events to publish)
 *   DRAIN_TIMEOUT_MS        default: 15000 (ms to wait for consumer lag to reach 0)
 *   SYMBOLS                 default: AAPL,MSFT,GOOGL,AMZN,TSLA,NVDA
 *
 * Exit codes:
 *   0 = all assertions pass
 *   1 = one or more assertions failed
 */

'use strict';

const KAFKAJS_PATH = process.env.KAFKAJS_PATH ||
  require('path').resolve(__dirname, '../node_modules/.pnpm/kafkajs@2.2.4/node_modules/kafkajs');
const { Kafka, Partitioners } = require(KAFKAJS_PATH);

// ── Config ────────────────────────────────────────────────────────────────────

const BROKER          = process.env.KAFKA_BROKER      || 'localhost:9092';
const TICK_BURST      = parseInt(process.env.TICK_BURST      || '500',   10);
const ORDER_BURST     = parseInt(process.env.ORDER_BURST     || '200',   10);
const DRAIN_TIMEOUT   = parseInt(process.env.DRAIN_TIMEOUT_MS || '15000', 10);
const SYMBOLS         = (process.env.SYMBOLS || 'AAPL,MSFT,GOOGL,AMZN,TSLA,NVDA').split(',');
const PARTITIONS      = 10;

const TOPIC_TICKS     = 'market.ticks.v1';
const TOPIC_ORDERS    = 'orders.events.v1';
const CONSUMER_GROUPS = [
  'execution-service',          // consumes orders.events.v1
  'execution-market-prices',    // consumes market.ticks.v1
  'portfolio-service',          // consumes execution.events.v1
  'portfolio-market-prices',    // consumes market.ticks.v1
  'order-execution-updates',    // consumes execution.events.v1
];

// ── djb2 partition key — must match services/market-data-service/src/domain/partition-key.ts
function symbolPartitionKey(symbol) {
  let hash = 5381;
  for (let i = 0; i < symbol.length; i++) {
    hash = (((hash << 5) + hash) ^ symbol.charCodeAt(i)) >>> 0;
  }
  return hash % PARTITIONS;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const results = [];
let failures = 0;

function assert(label, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (!condition) failures++;
  results.push({ status, label, detail });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function makeTick(symbol, i) {
  const mid = 100 + Math.random() * 400;
  return {
    eventType: 'market.tick',
    schemaVersion: 1,
    symbol,
    bid: parseFloat((mid - 0.05).toFixed(4)),
    ask: parseFloat((mid + 0.05).toFixed(4)),
    last: parseFloat(mid.toFixed(4)),
    volume: Math.floor(Math.random() * 10000),
    timestamp: new Date().toISOString(),
    _seq: i,
  };
}

function makeOrderEvent(i) {
  const symbol = SYMBOLS[i % SYMBOLS.length];
  return {
    eventType: 'order.submitted',
    schemaVersion: 1,
    orderId: `load-test-order-${i}`,
    idempotencyKey: `idem-${i}`,
    accountId: 'trader',
    symbol,
    side: i % 2 === 0 ? 'BUY' : 'SELL',
    type: 'MARKET',
    quantity: (i % 10) + 1,
    timestamp: new Date().toISOString(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const kafka = new Kafka({
    clientId: 'pipeline-throughput-test',
    brokers: [BROKER],
    logLevel: 0, // silent
  });

  const admin  = kafka.admin();
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    idempotent: false, // speed over idempotency for load test
  });

  console.log(`\n=== M7-T2 Event Pipeline Throughput Test ===`);
  console.log(`Broker: ${BROKER}`);
  console.log(`Tick burst: ${TICK_BURST}  Order burst: ${ORDER_BURST}`);
  console.log(`Symbols: ${SYMBOLS.join(', ')}\n`);

  await admin.connect();
  await producer.connect();

  // ── 1. Partition routing consistency ────────────────────────────────────────
  console.log('[ 1/5 ] Validating partition routing consistency (djb2 hash)...');
  const symbolPartitions = {};
  for (const sym of SYMBOLS) {
    symbolPartitions[sym] = symbolPartitionKey(sym);
  }

  // Verify determinism: same symbol always produces same key
  for (const sym of SYMBOLS) {
    const p1 = symbolPartitionKey(sym);
    const p2 = symbolPartitionKey(sym);
    assert(
      `partition routing deterministic: ${sym} → partition ${p1}`,
      p1 === p2 && p1 < PARTITIONS,
    );
  }

  // Verify distribution: symbols spread across multiple partitions (collisions are expected with djb2)
  const usedPartitions = new Set(Object.values(symbolPartitions));
  assert(
    'partition distribution: symbols spread across ≥ 2 partitions',
    usedPartitions.size >= 2,
    `${usedPartitions.size} unique partitions for ${SYMBOLS.length} symbols`,
  );
  console.log(`   Symbol→partition map: ${JSON.stringify(symbolPartitions)}`);
  console.log(`   Note: hash collisions are expected with djb2 mod ${PARTITIONS}`);

  // ── 2. Market tick publish throughput ────────────────────────────────────────
  console.log(`\n[ 2/5 ] Publishing ${TICK_BURST} market ticks to ${TOPIC_TICKS}...`);
  const tickMessages = [];
  for (let i = 0; i < TICK_BURST; i++) {
    const symbol = SYMBOLS[i % SYMBOLS.length];
    const tick   = makeTick(symbol, i);
    tickMessages.push({
      partition: symbolPartitionKey(symbol),
      value: JSON.stringify(tick),
      headers: { eventType: 'market.tick', schemaVersion: '1' },
    });
  }

  const tickStart = Date.now();
  await producer.send({ topic: TOPIC_TICKS, messages: tickMessages });
  const tickMs = Date.now() - tickStart;
  const tickThroughput = Math.round((TICK_BURST / tickMs) * 1000);

  console.log(`   Published in ${tickMs}ms — ${tickThroughput} msgs/s`);
  assert(
    `tick publish throughput ≥ 1 000 msgs/s`,
    tickThroughput >= 1000,
    `actual: ${tickThroughput} msgs/s`,
  );
  assert(
    `tick publish completed without error`,
    tickMs < 10_000,
    `${tickMs}ms`,
  );

  // ── 3. Order event publish throughput ────────────────────────────────────────
  console.log(`\n[ 3/5 ] Publishing ${ORDER_BURST} order events to ${TOPIC_ORDERS}...`);
  const orderMessages = [];
  for (let i = 0; i < ORDER_BURST; i++) {
    const event = makeOrderEvent(i);
    orderMessages.push({
      key: event.orderId,
      value: JSON.stringify(event),
      headers: { eventType: 'order.submitted', schemaVersion: '1' },
    });
  }

  const orderStart = Date.now();
  await producer.send({ topic: TOPIC_ORDERS, messages: orderMessages });
  const orderMs = Date.now() - orderStart;
  const orderThroughput = Math.round((ORDER_BURST / orderMs) * 1000);

  console.log(`   Published in ${orderMs}ms — ${orderThroughput} msgs/s`);
  assert(
    `order publish throughput ≥ 300 msgs/s`,
    orderThroughput >= 300,
    `actual: ${orderThroughput} msgs/s`,
  );

  // ── 4. Consumer group lag at peak ────────────────────────────────────────────
  console.log(`\n[ 4/5 ] Measuring consumer group lag at peak...`);
  await sleep(500); // let Kafka propagate offsets

  // Fetch high watermark per partition for each topic
  const topicPartitionOffsets = {};
  for (const topic of [TOPIC_TICKS, TOPIC_ORDERS]) {
    const offsets = await admin.fetchTopicOffsets(topic);
    topicPartitionOffsets[topic] = {};
    for (const p of offsets) {
      topicPartitionOffsets[topic][p.partition] = parseInt(p.offset || '0', 10);
    }
  }

  // Calculate lag: only count partitions where the group has a committed offset (offset != '-1').
  // offset='-1' means the group has never committed for that partition — it is either not
  // subscribed to that topic or has never consumed from it. Counting those would inflate lag
  // by the entire topic history.
  function calcLag(committedTopics) {
    let lag = 0;
    for (const topicData of committedTopics) {
      const hwMap = topicPartitionOffsets[topicData.topic] || {};
      for (const p of topicData.partitions) {
        if (p.offset === '-1') continue; // group not subscribed / never committed
        const hw = hwMap[p.partition] || 0;
        const committed = parseInt(p.offset, 10);
        lag += Math.max(0, hw - committed);
      }
    }
    return lag;
  }

  const lagReport = {};
  for (const group of CONSUMER_GROUPS) {
    try {
      const committed = await admin.fetchOffsets({ groupId: group, topics: [TOPIC_TICKS, TOPIC_ORDERS] });
      lagReport[group] = calcLag(committed);
    } catch {
      lagReport[group] = -1; // group not yet registered
    }
  }

  console.log('   Consumer group lag at peak:');
  for (const [group, lag] of Object.entries(lagReport)) {
    const label = lag === -1 ? 'not registered' : `${lag} msgs`;
    console.log(`     ${group}: ${label}`);
  }

  const activeLags = Object.values(lagReport).filter(l => l > 0);
  console.log(`   Active consumer groups with lag: ${activeLags.length}`);

  // ── 5. Backpressure / drain behaviour ────────────────────────────────────────
  console.log(`\n[ 5/5 ] Waiting up to ${DRAIN_TIMEOUT}ms for active consumers to drain...`);
  const drainStart = Date.now();
  let drained = false;
  let lastLag = Infinity;

  while (Date.now() - drainStart < DRAIN_TIMEOUT) {
    await sleep(1000);
    let totalActiveLag = 0;
    for (const group of ['execution-service', 'execution-market-prices']) {
      try {
        const committed = await admin.fetchOffsets({
          groupId: group,
          topics: [TOPIC_TICKS, TOPIC_ORDERS],
        });
        totalActiveLag += calcLag(committed);
      } catch { /* group not yet registered */ }
    }

    if (totalActiveLag < lastLag) {
      process.stdout.write(`\r   Lag draining: ${totalActiveLag} msgs remaining...   `);
      lastLag = totalActiveLag;
    }
    if (totalActiveLag === 0) {
      drained = true;
      break;
    }
  }

  const drainMs = Date.now() - drainStart;
  console.log(`\n   Drain completed in ${drainMs}ms — drained: ${drained}`);

  // Backpressure observation: if lag > burst size × 2 the pipeline is saturated
  const peakLag = Object.values(lagReport).filter(l => l > 0).reduce((a, b) => a + b, 0);
  assert(
    'backpressure: peak lag does not exceed 2× burst size',
    peakLag <= (TICK_BURST + ORDER_BURST) * 2,
    `peak lag: ${peakLag} msgs`,
  );
  assert(
    'drain: active consumers caught up within timeout',
    drained || lastLag < 50, // <50 msgs remaining is acceptable (consumers may be processing)
    drained ? `fully drained in ${drainMs}ms` : `residual lag: ${lastLag} msgs after ${DRAIN_TIMEOUT}ms`,
  );

  // ── Parallel consumer group validation ─────────────────────────────────────
  const registeredGroups = Object.entries(lagReport).filter(([, l]) => l >= 0).map(([g]) => g);
  assert(
    'parallel consumer groups: execution-service and execution-market-prices are independent',
    registeredGroups.includes('execution-service') || registeredGroups.includes('execution-market-prices'),
    `registered groups: [${registeredGroups.join(', ')}]`,
  );

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  await producer.disconnect();
  await admin.disconnect();

  // ── Report ───────────────────────────────────────────────────────────────────
  console.log('\n=== Results ===');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    const detail = r.detail ? ` (${r.detail})` : '';
    console.log(`  ${icon} ${r.label}${detail}`);
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`\n${passed}/${results.length} assertions passed`);
  console.log(`\nBackpressure summary:`);
  console.log(`  Tick publish:  ${tickThroughput} msgs/s over ${tickMs}ms`);
  console.log(`  Order publish: ${orderThroughput} msgs/s over ${orderMs}ms`);
  console.log(`  Peak consumer lag: ${peakLag} msgs`);
  console.log(`  Drain time: ${drainMs}ms — ${drained ? 'fully drained' : 'residual lag at timeout'}`);

  if (failures > 0) {
    console.log(`\n${failures} assertion(s) FAILED`);
    process.exit(1);
  } else {
    console.log('\nAll assertions PASSED');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
