import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import type { OrderFilledEvent } from '@pulsedesk/contracts';
import { MarketStreamGateway } from '../../interfaces/ws/market-stream.gateway';

@Injectable()
export class KafkaOrderFilledConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaOrderFilledConsumer.name);
  private readonly consumer: Consumer;
  private readonly topic: string;
  private readonly active: boolean;

  constructor(private readonly gateway: MarketStreamGateway) {
    const broker = process.env['KAFKA_BROKER'];
    this.topic = process.env['KAFKA_TOPIC_EXECUTION_EVENTS'] ?? 'execution.events.v1';
    this.active = Boolean(broker);

    if (!this.active) {
      this.consumer = null as unknown as Consumer;
      return;
    }

    const kafka = new Kafka({ clientId: 'notification-service-fills', brokers: [broker!] });
    this.consumer = kafka.consumer({ groupId: 'notification-service-fills' });
  }

  async onModuleInit(): Promise<void> {
    if (!this.active) {
      this.logger.warn('KAFKA_BROKER not set — order filled consumer inactive');
      return;
    }
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
    void this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const event = JSON.parse(message.value.toString()) as OrderFilledEvent;
          if (event.eventType !== 'execution.filled') return;
          this.gateway.broadcastFill(event);
        } catch (err) {
          this.logger.error(
            { error: (err as Error).message },
            'Failed to parse order filled message',
          );
        }
      },
    });
    this.logger.log(`Kafka consumer subscribed to '${this.topic}'`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.active) return;
    await this.consumer.disconnect();
    this.logger.log('Kafka order filled consumer disconnected');
  }
}
