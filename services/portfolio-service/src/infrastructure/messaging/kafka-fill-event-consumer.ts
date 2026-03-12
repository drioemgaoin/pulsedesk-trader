import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { OrderFilledEvent } from '@pulsedesk/contracts';
import { ProcessFillUseCase } from '../../application/use-cases/process-fill.use-case';

@Injectable()
export class KafkaFillEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaFillEventConsumer.name);
  private readonly consumer: Consumer;
  private readonly topic: string;

  constructor(private readonly processFill: ProcessFillUseCase) {
    const broker = process.env['KAFKA_BROKER'] ?? 'localhost:9092';
    const clientId = process.env['KAFKA_CLIENT_ID'] ?? 'portfolio-service';
    const groupId = process.env['KAFKA_CONSUMER_GROUP_PORTFOLIO'] ?? 'portfolio-service';
    this.topic = process.env['KAFKA_TOPIC_EXECUTION_EVENTS'] ?? 'execution.events.v1';

    const kafka = new Kafka({ clientId, brokers: [broker] });
    this.consumer = kafka.consumer({ groupId });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
    this.logger.log(`Subscribed to topic '${this.topic}'`);

    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ message, partition, topic }) => {
        if (!message.value) {
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        let event: OrderFilledEvent;
        try {
          event = JSON.parse(message.value.toString()) as OrderFilledEvent;
        } catch {
          this.logger.error({ topic, partition }, 'Failed to parse fill event — skipping');
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        if (
          typeof event.orderId !== 'string' || event.orderId.trim() === '' ||
          typeof event.executionId !== 'string' || event.executionId.trim() === '' ||
          typeof event.symbol !== 'string' || event.symbol.trim() === '' ||
          typeof event.filledQuantity !== 'number' || event.filledQuantity <= 0
        ) {
          this.logger.error(
            { topic, partition, offset: message.offset },
            'Malformed fill event — skipping (poison-pill)',
          );
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        try {
          await this.processFill.execute(event);
        } catch (err) {
          this.logger.error(
            { executionId: event.executionId, error: (err as Error).message },
            'Unhandled error processing fill event — skipping to avoid poison pill',
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
    this.logger.log('Kafka fill event consumer disconnected');
  }
}
