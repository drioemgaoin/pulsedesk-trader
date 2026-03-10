import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { MarketTickEvent } from '@pulsedesk/contracts';
import { IMarketPriceCache } from '../../domain/ports/market-price-cache.port';

@Injectable()
export class KafkaMarketTickConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaMarketTickConsumer.name);
  private readonly consumer: Consumer;
  private readonly topic: string;

  constructor(private readonly priceCache: IMarketPriceCache) {
    const broker = process.env['KAFKA_BROKER'] ?? 'localhost:9092';
    const clientId = process.env['KAFKA_CLIENT_ID'] ?? 'execution-service';
    const groupId = process.env['KAFKA_CONSUMER_GROUP_MARKET_PRICES'] ?? 'execution-market-prices';
    this.topic = process.env['KAFKA_TOPIC_MARKET_TICKS'] ?? 'market.ticks.v1';

    const kafka = new Kafka({ clientId, brokers: [broker] });
    this.consumer = kafka.consumer({ groupId });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
    this.logger.log(`Subscribed to topic '${this.topic}'`);

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const tick = JSON.parse(message.value.toString()) as MarketTickEvent;
          this.priceCache.setPrice(tick.symbol, tick.last);
        } catch {
          // malformed tick — skip silently; price cache not updated
        }
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
    this.logger.log('Kafka market tick consumer disconnected');
  }
}
