import { KafkaOrderFilledConsumer } from './kafka-order-filled-consumer';
import type { MarketStreamGateway } from '../../interfaces/ws/market-stream.gateway';
import type { OrderFilledEvent } from '@pulsedesk/contracts';

const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn().mockResolvedValue(undefined);
let capturedEachMessage: ((payload: { message: { value: Buffer | null } }) => Promise<void>) | null =
  null;
const mockRun = jest.fn().mockImplementation(async ({ eachMessage }) => {
  capturedEachMessage = eachMessage as typeof capturedEachMessage;
});

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: mockConnect,
      disconnect: mockDisconnect,
      subscribe: mockSubscribe,
      run: mockRun,
    }),
  })),
}));

const makeGateway = (): jest.Mocked<Pick<MarketStreamGateway, 'broadcastFill'>> => ({
  broadcastFill: jest.fn(),
});

const makeFill = (): OrderFilledEvent => ({
  eventType: 'execution.filled',
  schemaVersion: 1,
  executionId: 'exec-001',
  orderId: 'ord-001',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: 'BUY',
  filledQuantity: 10,
  fillPrice: 160.47,
  timestamp: new Date().toISOString(),
});

describe('Given a KafkaOrderFilledConsumer with KAFKA_BROKER set', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEachMessage = null;
    process.env['KAFKA_BROKER'] = 'localhost:9092';
  });

  afterEach(() => {
    delete process.env['KAFKA_BROKER'];
  });

  describe('when onModuleInit is called', () => {
    it('should connect the consumer and subscribe to the execution events topic', async () => {
      const consumer = new KafkaOrderFilledConsumer(makeGateway() as unknown as MarketStreamGateway);
      await consumer.onModuleInit();
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'execution.events.v1', fromBeginning: false }),
      );
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should disconnect the consumer', async () => {
      const consumer = new KafkaOrderFilledConsumer(makeGateway() as unknown as MarketStreamGateway);
      await consumer.onModuleInit();
      await consumer.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a valid order.filled message is received', () => {
    it('should call gateway.broadcastFill with the parsed event', async () => {
      const gateway = makeGateway();
      const consumer = new KafkaOrderFilledConsumer(gateway as unknown as MarketStreamGateway);
      await consumer.onModuleInit();
      const fill = makeFill();
      await capturedEachMessage!({ message: { value: Buffer.from(JSON.stringify(fill)) } });
      expect(gateway.broadcastFill).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'ord-001', accountId: 'acc-001', fillPrice: 160.47 }),
      );
    });
  });

  describe('when a message with a different eventType is received', () => {
    it('should not call broadcastFill', async () => {
      const gateway = makeGateway();
      const consumer = new KafkaOrderFilledConsumer(gateway as unknown as MarketStreamGateway);
      await consumer.onModuleInit();
      const unrelated = { eventType: 'execution.rejected', orderId: 'ord-002' };
      await capturedEachMessage!({ message: { value: Buffer.from(JSON.stringify(unrelated)) } });
      expect(gateway.broadcastFill).not.toHaveBeenCalled();
    });
  });

  describe('when a message with null value is received', () => {
    it('should not call broadcastFill', async () => {
      const gateway = makeGateway();
      const consumer = new KafkaOrderFilledConsumer(gateway as unknown as MarketStreamGateway);
      await consumer.onModuleInit();
      await capturedEachMessage!({ message: { value: null } });
      expect(gateway.broadcastFill).not.toHaveBeenCalled();
    });
  });

  describe('when a malformed message is received', () => {
    it('should not throw and should not call broadcastFill', async () => {
      const gateway = makeGateway();
      const consumer = new KafkaOrderFilledConsumer(gateway as unknown as MarketStreamGateway);
      await consumer.onModuleInit();
      await expect(
        capturedEachMessage!({ message: { value: Buffer.from('not-json{') } }),
      ).resolves.toBeUndefined();
      expect(gateway.broadcastFill).not.toHaveBeenCalled();
    });
  });
});

describe('Given a KafkaOrderFilledConsumer without KAFKA_BROKER set', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['KAFKA_BROKER'];
  });

  describe('when onModuleInit is called', () => {
    it('should not connect to Kafka', async () => {
      const consumer = new KafkaOrderFilledConsumer(makeGateway() as unknown as MarketStreamGateway);
      await consumer.onModuleInit();
      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should not disconnect', async () => {
      const consumer = new KafkaOrderFilledConsumer(makeGateway() as unknown as MarketStreamGateway);
      await consumer.onModuleDestroy();
      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });
});
