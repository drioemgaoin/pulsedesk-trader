import { KafkaOrderEventConsumer } from './kafka-order-event-consumer';
import { ProcessOrderUseCase } from '../../application/use-cases/process-order.use-case';
import { NoMarketPriceError } from '../../domain/errors/no-market-price.error';
import { OrderSubmittedEvent } from '@pulsedesk/contracts';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderType } from '../../domain/enums/order-type.enum';

const mockCommitOffsets = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn().mockResolvedValue(undefined);

let capturedEachMessage: ((ctx: unknown) => Promise<void>) | null = null;
const mockRun = jest.fn().mockImplementation(({ eachMessage }: { eachMessage: (ctx: unknown) => Promise<void> }) => {
  capturedEachMessage = eachMessage;
  return Promise.resolve();
});

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

const makeEvent = (): OrderSubmittedEvent => ({
  eventType: 'order.submitted',
  schemaVersion: 1,
  orderId: 'order-1',
  idempotencyKey: 'cmd-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 10,
  limitPrice: 150,
  timestamp: '2026-03-10T00:00:00.000Z',
});

const makeCtx = (value: string | null) => ({
  message: { value: value ? Buffer.from(value) : null, offset: '5' },
  partition: 0,
  topic: 'orders.events.v1',
  heartbeat: jest.fn().mockResolvedValue(undefined),
});

const makeUseCase = (impl?: () => Promise<unknown>): jest.Mocked<Pick<ProcessOrderUseCase, 'execute'>> => ({
  execute: jest.fn().mockImplementation(impl ?? (() => Promise.resolve({ execution: {}, created: true }))),
});

describe('Given a KafkaOrderEventConsumer instance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEachMessage = null;
  });

  describe('when onModuleInit is called', () => {
    it('should connect, subscribe to the order events topic, and start running', async () => {
      const consumer = new KafkaOrderEventConsumer({ execute: jest.fn() } as unknown as ProcessOrderUseCase);
      await consumer.onModuleInit();
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(expect.objectContaining({ topic: 'orders.events.v1' }));
      expect(mockRun).toHaveBeenCalledTimes(1);
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should disconnect the consumer', async () => {
      const consumer = new KafkaOrderEventConsumer({ execute: jest.fn() } as unknown as ProcessOrderUseCase);
      await consumer.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a valid order event is received and processing succeeds', () => {
    it('should call the use case and commit the offset', async () => {
      const useCase = makeUseCase();
      const consumer = new KafkaOrderEventConsumer(useCase as unknown as ProcessOrderUseCase);
      await consumer.onModuleInit();
      await capturedEachMessage!(makeCtx(JSON.stringify(makeEvent())));
      expect(useCase.execute).toHaveBeenCalledTimes(1);
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: 'orders.events.v1', partition: 0, offset: '6' },
      ]);
    });
  });

  describe('when the use case throws NoMarketPriceError', () => {
    it('should NOT commit the offset so Kafka redelivers the message', async () => {
      const useCase = makeUseCase(() => Promise.reject(new NoMarketPriceError('AAPL')));
      const consumer = new KafkaOrderEventConsumer(useCase as unknown as ProcessOrderUseCase);
      await consumer.onModuleInit();
      await capturedEachMessage!(makeCtx(JSON.stringify(makeEvent())));
      expect(mockCommitOffsets).not.toHaveBeenCalled();
    });
  });

  describe('when the use case throws an unexpected error', () => {
    it('should commit the offset to avoid poison pill', async () => {
      const useCase = makeUseCase(() => Promise.reject(new Error('unexpected db error')));
      const consumer = new KafkaOrderEventConsumer(useCase as unknown as ProcessOrderUseCase);
      await consumer.onModuleInit();
      await capturedEachMessage!(makeCtx(JSON.stringify(makeEvent())));
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: 'orders.events.v1', partition: 0, offset: '6' },
      ]);
    });
  });

  describe('when a message with null value is received', () => {
    it('should return early without calling the use case', async () => {
      const useCase = makeUseCase();
      const consumer = new KafkaOrderEventConsumer(useCase as unknown as ProcessOrderUseCase);
      await consumer.onModuleInit();
      await capturedEachMessage!(makeCtx(null));
      expect(useCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('when a malformed (non-JSON) message is received', () => {
    it('should skip the message and commit the offset', async () => {
      const useCase = makeUseCase();
      const consumer = new KafkaOrderEventConsumer(useCase as unknown as ProcessOrderUseCase);
      await consumer.onModuleInit();
      await capturedEachMessage!(makeCtx('not-valid-json'));
      expect(useCase.execute).not.toHaveBeenCalled();
      expect(mockCommitOffsets).toHaveBeenCalledWith([
        { topic: 'orders.events.v1', partition: 0, offset: '6' },
      ]);
    });
  });
});
