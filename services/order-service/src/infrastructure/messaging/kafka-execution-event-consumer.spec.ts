/**
 * QA — Integration / Resilience spec for KafkaExecutionEventConsumer
 *
 * Scope  : consumer lifecycle, message routing, poison-pill handling, offset commits.
 * Style  : describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 * Notes  : Kafka broker is mocked; no live Kafka dependency required.
 */

import { KafkaExecutionEventConsumer } from './kafka-execution-event-consumer';
import { ProcessFillNotificationUseCase } from '../../application/use-cases/process-fill-notification.use-case';
import { OrderFilledEvent } from '@pulsedesk/contracts';

// ---------------------------------------------------------------------------
// Kafka mock — hoisted so the constructor mock is in place before imports run
// ---------------------------------------------------------------------------

const mockCommitOffsets = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

// run() captures the eachMessage handler so tests can invoke it directly.
let capturedEachMessage: ((payload: unknown) => Promise<void>) | undefined;

const mockRun = jest.fn().mockImplementation(async (opts: { eachMessage: (p: unknown) => Promise<void> }) => {
  capturedEachMessage = opts.eachMessage;
});

const mockConsumer = {
  connect: mockConnect,
  subscribe: mockSubscribe,
  run: mockRun,
  disconnect: mockDisconnect,
  commitOffsets: mockCommitOffsets,
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue(mockConsumer),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOPIC = 'execution.events.v1';
const PARTITION = 0;

function buildFilledEvent(overrides: Partial<OrderFilledEvent> = {}): OrderFilledEvent {
  return {
    eventType: 'execution.filled',
    schemaVersion: 1,
    executionId: 'exec-001',
    orderId: 'order-001',
    accountId: 'acc-001',
    symbol: 'AAPL',
    side: 'BUY',
    filledQuantity: 10,
    fillPrice: 150,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function buildMessage(value: string | null, offset = '5') {
  return {
    topic: TOPIC,
    partition: PARTITION,
    message: {
      offset,
      value: value === null ? null : Buffer.from(value),
    },
  };
}

function makeMockUseCase(): jest.Mocked<ProcessFillNotificationUseCase> {
  return {
    execute: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<ProcessFillNotificationUseCase>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KafkaExecutionEventConsumer', () => {
  let useCase: jest.Mocked<ProcessFillNotificationUseCase>;
  let consumer: KafkaExecutionEventConsumer;

  beforeEach(async () => {
    jest.clearAllMocks();
    capturedEachMessage = undefined;
    useCase = makeMockUseCase();
    consumer = new KafkaExecutionEventConsumer(useCase);
    await consumer.onModuleInit();
  });

  afterEach(async () => {
    await consumer.onModuleDestroy();
  });

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  describe('when the module initialises', () => {
    it('should connect the Kafka consumer', () => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should subscribe to the execution events topic', () => {
      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({ topic: TOPIC }),
      );
    });

    it('should start running with autoCommit disabled', () => {
      expect(mockRun).toHaveBeenCalledWith(
        expect.objectContaining({ autoCommit: false }),
      );
    });
  });

  describe('when the module is destroyed', () => {
    it('should disconnect the Kafka consumer', async () => {
      // onModuleDestroy already called in afterEach — verify it was called
      await consumer.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Valid fill event
  // -------------------------------------------------------------------------

  describe('when a valid execution.filled message arrives', () => {
    it('should call the ProcessFillNotificationUseCase with the parsed event', async () => {
      const event = buildFilledEvent();
      await capturedEachMessage!(buildMessage(JSON.stringify(event)));

      expect(useCase.execute).toHaveBeenCalledTimes(1);
      expect(useCase.execute).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'execution.filled',
        orderId: 'order-001',
        executionId: 'exec-001',
      }));
    });

    it('should commit the offset after successful processing', async () => {
      const event = buildFilledEvent();
      await capturedEachMessage!(buildMessage(JSON.stringify(event), '10'));

      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: TOPIC, partition: PARTITION, offset: '11' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Null message
  // -------------------------------------------------------------------------

  describe('when a null-value message arrives (tombstone)', () => {
    it('should not call the use case', async () => {
      await capturedEachMessage!(buildMessage(null));
      expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('should commit the offset to advance past the tombstone', async () => {
      await capturedEachMessage!(buildMessage(null, '3'));
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: TOPIC, partition: PARTITION, offset: '4' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Malformed JSON — poison-pill
  // -------------------------------------------------------------------------

  describe('when a message with malformed JSON arrives', () => {
    it('should not call the use case', async () => {
      await capturedEachMessage!(buildMessage('{not valid json'));
      expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('should commit the offset (poison-pill skip) to unblock the consumer', async () => {
      await capturedEachMessage!(buildMessage('{not valid json', '7'));
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: TOPIC, partition: PARTITION, offset: '8' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Unexpected use-case error — resilience / poison-pill
  // -------------------------------------------------------------------------

  describe('when the use case throws an unexpected error', () => {
    it('should not propagate the error', async () => {
      useCase.execute.mockRejectedValueOnce(new Error('unexpected db failure'));
      const event = buildFilledEvent();
      await expect(
        capturedEachMessage!(buildMessage(JSON.stringify(event))),
      ).resolves.toBeUndefined();
    });

    it('should still commit the offset to avoid an infinite retry loop', async () => {
      useCase.execute.mockRejectedValueOnce(new Error('unexpected db failure'));
      const event = buildFilledEvent();
      await capturedEachMessage!(buildMessage(JSON.stringify(event), '20'));
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: TOPIC, partition: PARTITION, offset: '21' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Non-fill eventType filter
  // -------------------------------------------------------------------------

  describe('when a message with a non-fill eventType arrives', () => {
    it('should not call the use case for eventType execution.cancelled', async () => {
      const nonFill = { ...buildFilledEvent(), eventType: 'execution.cancelled' };
      await capturedEachMessage!(buildMessage(JSON.stringify(nonFill)));
      expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('should not call the use case for eventType order.submitted', async () => {
      const wrongEvent = { ...buildFilledEvent(), eventType: 'order.submitted' };
      await capturedEachMessage!(buildMessage(JSON.stringify(wrongEvent)));
      expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('should commit the offset after filtering out non-fill events', async () => {
      const nonFill = { ...buildFilledEvent(), eventType: 'execution.cancelled' };
      await capturedEachMessage!(buildMessage(JSON.stringify(nonFill), '15'));
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: TOPIC, partition: PARTITION, offset: '16' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Replay / idempotency — same offset twice
  // -------------------------------------------------------------------------

  describe('when the same fill message is delivered twice (consumer retry / replay)', () => {
    it('should call the use case both times (idempotency is owned by the use case, not the consumer)', async () => {
      const event = buildFilledEvent();
      const msg = buildMessage(JSON.stringify(event), '5');
      await capturedEachMessage!(msg);
      await capturedEachMessage!(msg);
      expect(useCase.execute).toHaveBeenCalledTimes(2);
    });

    it('should commit the offset both times', async () => {
      const event = buildFilledEvent();
      const msg = buildMessage(JSON.stringify(event), '5');
      await capturedEachMessage!(msg);
      await capturedEachMessage!(msg);
      expect(mockCommitOffsets).toHaveBeenCalledTimes(2);
    });
  });
});
