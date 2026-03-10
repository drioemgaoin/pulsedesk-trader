import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka, Producer } from 'kafkajs';
import { OrderSubmittedEvent } from '@pulsedesk/contracts';
import { IOrderEventPublisher } from '../../domain/ports/order-event-publisher.port';
import type { Order } from '../../domain/order.entity';

const TOPIC_PARTITIONS = 10;

@Injectable()
export class KafkaOrderEventPublisher implements IOrderEventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaOrderEventPublisher.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly topic: string;

  constructor() {
    const broker = process.env['KAFKA_BROKER'] ?? 'localhost:9092';
    const clientId = process.env['KAFKA_CLIENT_ID'] ?? 'order-service';
    this.topic = process.env['KAFKA_TOPIC_ORDER_EVENTS'] ?? 'orders.events.v1';

    this.kafka = new Kafka({ clientId, brokers: [broker] });
    this.producer = this.kafka.producer({
      idempotent: true,
      retry: { retries: 5, initialRetryTime: 100, maxRetryTime: 3000 },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureTopic();
    await this.producer.connect();
    this.logger.log('Kafka order event producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
    this.logger.log('Kafka order event producer disconnected');
  }

  async publishAccepted(order: Order): Promise<void> {
    const event: OrderSubmittedEvent = {
      eventType: 'order.submitted',
      schemaVersion: 1,
      orderId: order.id,
      idempotencyKey: order.commandId,
      accountId: order.accountId,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      limitPrice: order.limitPrice ?? undefined,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            key: order.id,
            value: JSON.stringify(event),
            headers: {
              eventType: event.eventType,
              schemaVersion: String(event.schemaVersion),
            },
          },
        ],
      });
    } catch (err) {
      this.logger.error(
        { orderId: order.id, error: (err as Error).message },
        'Failed to publish accepted order event to Kafka',
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
