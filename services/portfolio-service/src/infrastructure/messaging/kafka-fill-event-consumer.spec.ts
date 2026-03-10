/**
 * Spec — KafkaFillEventConsumer (consumer offset strategy + resilience)
 *
 * Scope: verifies manual offset commit strategy, poison-pill skip behaviour,
 * lifecycle hooks, duplicate-fill handling delegation to ProcessFillUseCase,
 * and replay ordering.
 *
 * Style: describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 */

import { KafkaFillEventConsumer } from './kafka-fill-event-consumer';
import { ProcessFillUseCase } from '../../application/use-cases/process-fill.use-case';
import { OrderFilledEvent } from '@pulsedesk/contracts';
import { OrderSide } from '../../domain/enums/order-side.enum';

// ---------------------------------------------------------------------------
// KafkaJS mock
// ---------------------------------------------------------------------------

const mockCommitOffsets = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn().mockResolvedValue(undefined);

type EachMessageHandler = (ctx: unknown) => Promise<void>;
let capturedHandler: EachMessageHandler | null = null;

const mockRun = jest.fn().mockImplementation(
  ({ eachMessage }: { eachMessage: EachMessageHandler }) => {
    capturedHandler = eachMessage;
    return Promise.resolve();
  },
);

const mockConsumer = {
  connect: mockConnect,
  disconnect: mockDisconnect,
  subscribe: mockSubscribe,
  run: mockRun,
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

const makeFillEvent = (overrides: Partial<OrderFilledEvent> = {}): OrderFilledEvent => ({
  eventType: 'execution.filled',
  schemaVersion: 1,
  executionId: 'exec-100',
  orderId: 'order-100',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  filledQuantity: 10,
  fillPrice: 150,
  timestamp: '2026-03-10T00:00:00.000Z',
  ...overrides,
});

const makeCtx = (value: string | null, offset = '10') => ({
  message: { value: value !== null ? Buffer.from(value) : null, offset },
  partition: 0,
  topic: 'execution.events.v1',
  heartbeat: jest.fn().mockResolvedValue(undefined),
});

const makeUseCase = (impl?: () => Promise<void>): jest.Mocked<Pick<ProcessFillUseCase, 'execute'>> => ({
  execute: jest.fn().mockImplementation(impl ?? (() => Promise.resolve())),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('KafkaFillEventConsumer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedHandler = null;
  });

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  describe('when onModuleInit is called', () => {
    it('should connect the consumer, subscribe to the execution events topic, and start running', async () => {
      const consumer = new KafkaFillEventConsumer(makeUseCase() as unknown as ProcessFillUseCase);
      await consumer.onModuleInit();

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'execution.events.v1' }),
      );
      expect(mockRun).toHaveBeenCalledTimes(1);
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should disconnect the consumer to allow graceful shutdown', async () => {
      const consumer = new KafkaFillEventConsumer(makeUseCase() as unknown as ProcessFillUseCase);
      await consumer.onModuleDestroy();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Offset commit strategy — autoCommit: false
  // -------------------------------------------------------------------------

  describe('when a valid fill event is received and processing succeeds', () => {
    it('should invoke the use case and commit offset + 1', async () => {
      const useCase = makeUseCase();
      const consumer = new KafkaFillEventConsumer(useCase as unknown as ProcessFillUseCase);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(JSON.stringify(makeFillEvent())));

      expect(useCase.execute).toHaveBeenCalledTimes(1);
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: 'execution.events.v1', partition: 0, offset: '11' },
      ]);
    });
  });

  describe('when the use case throws an unexpected error', () => {
    it('should commit the offset to prevent a poison-pill re-delivery loop', async () => {
      const useCase = makeUseCase(() => Promise.reject(new Error('unexpected db error')));
      const consumer = new KafkaFillEventConsumer(useCase as unknown as ProcessFillUseCase);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(JSON.stringify(makeFillEvent())));

      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: 'execution.events.v1', partition: 0, offset: '11' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Null / malformed message handling
  // -------------------------------------------------------------------------

  describe('when a message with a null value is received', () => {
    it('should skip processing, not invoke the use case, and commit the offset', async () => {
      const useCase = makeUseCase();
      const consumer = new KafkaFillEventConsumer(useCase as unknown as ProcessFillUseCase);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(null));

      expect(useCase.execute).not.toHaveBeenCalled();
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: 'execution.events.v1', partition: 0, offset: '11' },
      ]);
    });
  });

  describe('when a malformed (non-JSON) message is received', () => {
    it('should skip processing, not invoke the use case, and commit the offset to avoid poison pill', async () => {
      const useCase = makeUseCase();
      const consumer = new KafkaFillEventConsumer(useCase as unknown as ProcessFillUseCase);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx('{invalid-json'));

      expect(useCase.execute).not.toHaveBeenCalled();
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: 'execution.events.v1', partition: 0, offset: '11' },
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Duplicate fill event handling (at-least-once re-delivery)
  // -------------------------------------------------------------------------

  describe('when the same fill event is delivered twice due to at-least-once Kafka semantics', () => {
    it('should invoke the use case both times (idempotency enforced by repository, not by consumer)', async () => {
      const useCase = makeUseCase();
      const consumer = new KafkaFillEventConsumer(useCase as unknown as ProcessFillUseCase);
      const serialised = JSON.stringify(makeFillEvent({ executionId: 'exec-dup' }));

      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(serialised, '20'));
      await capturedHandler!(makeCtx(serialised, '21'));

      expect(useCase.execute).toHaveBeenCalledTimes(2);
      expect(mockCommitOffsets).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Replay scenario
  // -------------------------------------------------------------------------

  describe('when a sequence of fill events is replayed in order', () => {
    it('should process each event independently and commit each offset sequentially', async () => {
      const useCase = makeUseCase();
      const consumer = new KafkaFillEventConsumer(useCase as unknown as ProcessFillUseCase);

      const events = [
        makeFillEvent({ executionId: 'exec-replay-1', fillPrice: 100 }),
        makeFillEvent({ executionId: 'exec-replay-2', fillPrice: 110 }),
        makeFillEvent({ executionId: 'exec-replay-3', fillPrice: 120 }),
      ];

      await consumer.onModuleInit();
      for (let i = 0; i < events.length; i++) {
        await capturedHandler!(makeCtx(JSON.stringify(events[i]), String(i)));
      }

      expect(useCase.execute).toHaveBeenCalledTimes(3);
      expect(mockCommitOffsets).toHaveBeenCalledTimes(3);
      expect(mockCommitOffsets).toHaveBeenNthCalledWith(1, [
        { topic: 'execution.events.v1', partition: 0, offset: '1' },
      ]);
      expect(mockCommitOffsets).toHaveBeenNthCalledWith(3, [
        { topic: 'execution.events.v1', partition: 0, offset: '3' },
      ]);
    });
  });
});
