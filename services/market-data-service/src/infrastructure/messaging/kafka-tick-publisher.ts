import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka, Producer } from 'kafkajs';
import { TICK_METRICS, type ITickMetrics } from '../../application/ports/metrics.port';
import type { ITickPublisher } from '../../domain/ports/tick-publisher.port';
import type { Tick } from '../../domain/tick';

const TOPIC_PARTITIONS = 10;

@Injectable()
export class KafkaTickPublisher implements ITickPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaTickPublisher.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly topic: string;

  constructor(@Inject(TICK_METRICS) private readonly metrics: ITickMetrics) {
    const broker = process.env['KAFKA_BROKER'] ?? 'localhost:9092';
    const clientId = process.env['KAFKA_CLIENT_ID'] ?? 'market-data-service';
    this.topic = process.env['KAFKA_TOPIC_MARKET_TICKS'] ?? 'market.ticks.v1';

    this.kafka = new Kafka({ clientId, brokers: [broker] });
    this.producer = this.kafka.producer({
      idempotent: true,
      retry: { retries: 5, initialRetryTime: 100, maxRetryTime: 3000 },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureTopic();
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
    this.logger.log('Kafka producer disconnected');
  }

  async publish(tick: Tick, partitionKey: number): Promise<void> {
    const event = tick.toMarketEvent();
    try {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            partition: partitionKey,
            value: JSON.stringify(event),
            headers: {
              eventType: event.eventType,
              schemaVersion: String(event.schemaVersion),
            },
          },
        ],
      });
    } catch (err) {
      this.metrics.incrementPublishFailed();
      this.logger.error(
        { symbol: tick.symbol, error: (err as Error).message },
        'Failed to publish tick to Kafka',
      );
    }
  }

  private async ensureTopic(): Promise<void> {
    const admin: Admin = this.kafka.admin();
    try {
      await admin.connect();
      const created = await admin.createTopics({
        waitForLeaders: true,
        topics: [{ topic: this.topic, numPartitions: TOPIC_PARTITIONS, replicationFactor: 1 }],
      });
      if (created) {
        this.logger.log(`Topic '${this.topic}' created with ${TOPIC_PARTITIONS} partitions`);
      } else {
        this.logger.log(`Topic '${this.topic}' already exists`);
      }
    } finally {
      await admin.disconnect();
    }
  }
}
