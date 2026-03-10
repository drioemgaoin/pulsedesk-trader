import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka, Producer } from 'kafkajs';
import { OrderFilledEvent } from '@pulsedesk/contracts';
import { IFillEventPublisher } from '../../domain/ports/fill-event-publisher.port';
import type { Execution } from '../../domain/execution.entity';

const TOPIC_PARTITIONS = 10;

@Injectable()
export class KafkaFillEventPublisher implements IFillEventPublisher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaFillEventPublisher.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly topic: string;

  constructor() {
    const broker = process.env['KAFKA_BROKER'] ?? 'localhost:9092';
    const clientId = process.env['KAFKA_CLIENT_ID'] ?? 'execution-service';
    this.topic = process.env['KAFKA_TOPIC_EXECUTION_EVENTS'] ?? 'execution.events.v1';

    this.kafka = new Kafka({ clientId, brokers: [broker] });
    this.producer = this.kafka.producer({
      idempotent: true,
      retry: { retries: 5, initialRetryTime: 100, maxRetryTime: 3000 },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureTopic();
    await this.producer.connect();
    this.logger.log('Kafka fill event producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
    this.logger.log('Kafka fill event producer disconnected');
  }

  async publishFill(execution: Execution): Promise<void> {
    const event: OrderFilledEvent = {
      eventType: 'execution.filled',
      schemaVersion: 1,
      executionId: execution.id,
      orderId: execution.orderId,
      accountId: execution.accountId,
      symbol: execution.symbol,
      side: execution.side,
      filledQuantity: execution.filledQuantity,
      fillPrice: execution.fillPrice,
      timestamp: new Date().toISOString(),
    };

    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: execution.orderId,
          value: JSON.stringify(event),
          headers: {
            eventType: event.eventType,
            schemaVersion: String(event.schemaVersion),
          },
        },
      ],
    });
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
