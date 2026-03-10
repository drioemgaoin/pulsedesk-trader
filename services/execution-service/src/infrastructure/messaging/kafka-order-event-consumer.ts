import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { OrderSubmittedEvent } from '@pulsedesk/contracts';
import { ProcessOrderUseCase } from '../../application/use-cases/process-order.use-case';
import { NoMarketPriceError } from '../../domain/errors/no-market-price.error';

@Injectable()
export class KafkaOrderEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaOrderEventConsumer.name);
  private readonly consumer: Consumer;
  private readonly topic: string;

  constructor(private readonly processOrder: ProcessOrderUseCase) {
    const broker = process.env['KAFKA_BROKER'] ?? 'localhost:9092';
    const clientId = process.env['KAFKA_CLIENT_ID'] ?? 'execution-service';
    const groupId = process.env['KAFKA_CONSUMER_GROUP_EXECUTION'] ?? 'execution-service';
    this.topic = process.env['KAFKA_TOPIC_ORDER_EVENTS'] ?? 'orders.events.v1';

    const kafka = new Kafka({ clientId, brokers: [broker] });
    this.consumer = kafka.consumer({ groupId });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
    this.logger.log(`Subscribed to topic '${this.topic}'`);

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ message, partition, topic, heartbeat }) => {
        if (!message.value) return;

        let event: OrderSubmittedEvent;
        try {
          event = JSON.parse(message.value.toString()) as OrderSubmittedEvent;
        } catch {
          this.logger.error({ topic, partition }, 'Failed to parse order event — skipping');
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        try {
          await this.processOrder.execute(event);
        } catch (err) {
          if (err instanceof NoMarketPriceError) {
            this.logger.warn(
              { symbol: event.symbol, orderId: event.orderId },
              'No market price cached — offset not committed, redelivery pending',
            );
            await heartbeat();
            return; // do not commit — Kafka will redeliver
          }
          this.logger.error(
            { orderId: event.orderId, error: (err as Error).message },
            'Unhandled error processing order event — skipping to avoid poison pill',
          );
        }

        await this.consumer.commitOffsets([
          { topic, partition, offset: String(Number(message.offset) + 1) },
        ]);
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
    this.logger.log('Kafka order event consumer disconnected');
  }
}
