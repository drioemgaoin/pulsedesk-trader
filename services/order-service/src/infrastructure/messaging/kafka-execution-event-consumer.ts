import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { OrderFilledEvent } from '@pulsedesk/contracts';
import { ProcessFillNotificationUseCase } from '../../application/use-cases/process-fill-notification.use-case';

@Injectable()
export class KafkaExecutionEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaExecutionEventConsumer.name);
  private readonly consumer: Consumer;
  private readonly topic: string;

  constructor(private readonly processFillNotification: ProcessFillNotificationUseCase) {
    const broker = process.env['KAFKA_BROKER'] ?? 'localhost:9092';
    const clientId = process.env['KAFKA_CLIENT_ID'] ?? 'order-service';
    const groupId = process.env['KAFKA_CONSUMER_GROUP_EXECUTION_UPDATES'] ?? 'order-execution-updates';
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
          this.logger.error({ topic, partition }, 'Failed to parse execution event — skipping (poison-pill)');
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        // Filter: only handle execution.filled events
        if (event.eventType !== 'execution.filled') {
          this.logger.log(
            { eventType: event.eventType, topic, partition },
            'Ignoring non-fill execution event',
          );
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        // Validate required fields before use-case dispatch (OWASP API3 — untrusted event payload)
        if (
          typeof event.orderId !== 'string' || event.orderId.trim() === '' ||
          typeof event.executionId !== 'string' || event.executionId.trim() === ''
        ) {
          this.logger.error(
            { orderId: event.orderId, executionId: event.executionId, topic, partition },
            'Malformed execution.filled event: missing or invalid orderId/executionId — skipping (poison-pill)',
          );
          await this.consumer.commitOffsets([
            { topic, partition, offset: String(Number(message.offset) + 1) },
          ]);
          return;
        }

        try {
          await this.processFillNotification.execute(event);
        } catch (err) {
          // Unexpected error — commit offset to avoid infinite retry (poison-pill pattern)
          this.logger.error(
            { orderId: event.orderId, executionId: event.executionId, error: (err as Error).message },
            'Unhandled error processing fill notification — skipping to avoid poison pill',
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
    this.logger.log('Kafka execution event consumer disconnected');
  }
}
