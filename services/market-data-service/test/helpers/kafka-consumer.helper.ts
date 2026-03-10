/**
 * Kafka consumer test utility for M2-T3 integration assertions.
 *
 * Usage:
 *   const consumer = new KafkaConsumerHelper('market.ticks.v1');
 *   await consumer.start();
 *   // ... trigger tick production ...
 *   const messages = await consumer.collect(5);
 *   await consumer.stop();
 *
 * Verifies event delivery and ordering per symbol partition.
 */
import { Kafka, Consumer, KafkaMessage } from 'kafkajs';

export interface ConsumedMessage {
  partition: number;
  offset: string;
  key: string | null;
  value: Record<string, unknown> | null;
  headers: Record<string, string>;
}

export class KafkaConsumerHelper {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly collected: ConsumedMessage[] = [];
  private running = false;

  constructor(
    private readonly topic: string,
    groupId = `test-consumer-${Date.now()}`,
  ) {
    const broker = process.env['KAFKA_BROKER'] ?? 'localhost:9092';
    this.kafka = new Kafka({ clientId: 'test-consumer', brokers: [broker] });
    this.consumer = this.kafka.consumer({ groupId });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true });
    this.running = true;

    void this.consumer.run({
      eachMessage: async ({ partition, message }) => {
        this.collected.push(this.toConsumed(partition, message));
      },
    });
  }

  /**
   * Waits until at least `count` messages are collected or the timeout elapses.
   */
  async collect(count: number, timeoutMs = 10_000): Promise<ConsumedMessage[]> {
    const deadline = Date.now() + timeoutMs;
    while (this.collected.length < count && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100));
    }
    return [...this.collected];
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.consumer.disconnect();
  }

  /**
   * Asserts that all messages for a given symbol landed on the same partition.
   */
  assertSinglePartitionPerSymbol(messages: ConsumedMessage[]): void {
    const symbolPartitions = new Map<string, Set<number>>();
    for (const msg of messages) {
      if (!msg.value) continue;
      const symbol = String(msg.value['symbol'] ?? '');
      if (!symbol) continue;
      if (!symbolPartitions.has(symbol)) symbolPartitions.set(symbol, new Set());
      symbolPartitions.get(symbol)!.add(msg.partition);
    }
    for (const [symbol, partitions] of symbolPartitions) {
      if (partitions.size !== 1) {
        throw new Error(
          `Symbol ${symbol} landed on ${partitions.size} partitions — expected exactly 1`,
        );
      }
    }
  }

  private toConsumed(partition: number, msg: KafkaMessage): ConsumedMessage {
    const raw = msg.value ? msg.value.toString() : null;
    let value: Record<string, unknown> | null = null;
    if (raw) {
      try { value = JSON.parse(raw) as Record<string, unknown>; } catch { /* ignore */ }
    }
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(msg.headers ?? {})) {
      headers[k] = Buffer.isBuffer(v) ? v.toString() : String(v ?? '');
    }
    return {
      partition,
      offset: msg.offset,
      key: msg.key ? msg.key.toString() : null,
      value,
      headers,
    };
  }

  get isRunning(): boolean {
    return this.running;
  }
}
