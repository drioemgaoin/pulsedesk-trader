import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import type { MarketTickEvent } from '@pulsedesk/contracts';
import {
  MARKET_TICK_BROADCASTER,
  type IMarketTickBroadcaster,
} from '../../domain/ports/market-tick-broadcaster.port';

@Injectable()
export class KafkaMarketTickConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaMarketTickConsumer.name);
  private readonly consumer: Consumer;
  private readonly topic: string;
  private readonly active: boolean;

  constructor(
    @Inject(MARKET_TICK_BROADCASTER) private readonly broadcaster: IMarketTickBroadcaster,
  ) {
    const broker = process.env['KAFKA_BROKER'];
    this.topic = process.env['KAFKA_TOPIC_MARKET_TICKS'] ?? 'market.ticks.v1';
    this.active = Boolean(broker);

    if (!this.active) {
      this.consumer = null as unknown as Consumer;
      return;
    }

    const kafka = new Kafka({ clientId: 'notification-service', brokers: [broker!] });
    this.consumer = kafka.consumer({ groupId: 'notification-service' });
  }

  async onModuleInit(): Promise<void> {
    if (!this.active) {
      this.logger.warn('KAFKA_BROKER not set — market tick consumer inactive');
      return;
    }
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
    void this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const event = JSON.parse(message.value.toString()) as MarketTickEvent;
          this.broadcaster.broadcast(event);
        } catch (err) {
          this.logger.error(
            { error: (err as Error).message },
            'Failed to parse market tick message',
          );
        }
      },
    });
    this.logger.log(`Kafka consumer subscribed to '${this.topic}'`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.active) return;
    await this.consumer.disconnect();
    this.logger.log('Kafka consumer disconnected');
  }
}
