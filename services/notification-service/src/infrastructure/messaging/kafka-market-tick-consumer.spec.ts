import { KafkaMarketTickConsumer } from './kafka-market-tick-consumer';
import type { IMarketTickBroadcaster } from '../../domain/ports/market-tick-broadcaster.port';
import type { MarketTickEvent } from '@pulsedesk/contracts';

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

const makeBroadcaster = (): jest.Mocked<IMarketTickBroadcaster> => ({
  broadcast: jest.fn(),
});

const makeTick = (): MarketTickEvent => ({
  eventType: 'market.tick',
  schemaVersion: 1,
  symbol: 'AAPL',
  bid: 174.99,
  ask: 175.01,
  last: 175.0,
  volume: 1000,
  timestamp: new Date().toISOString(),
});

describe('Given a KafkaMarketTickConsumer with KAFKA_BROKER set', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEachMessage = null;
    process.env['KAFKA_BROKER'] = 'localhost:9092';
  });

  afterEach(() => {
    delete process.env['KAFKA_BROKER'];
  });

  describe('when onModuleInit is called', () => {
    it('should connect the consumer and subscribe to the market ticks topic', async () => {
      const consumer = new KafkaMarketTickConsumer(makeBroadcaster());
      await consumer.onModuleInit();
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'market.ticks.v1', fromBeginning: false }),
      );
    });

    it('should start the consume loop', async () => {
      const consumer = new KafkaMarketTickConsumer(makeBroadcaster());
      await consumer.onModuleInit();
      expect(mockRun).toHaveBeenCalledTimes(1);
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should disconnect the consumer', async () => {
      const consumer = new KafkaMarketTickConsumer(makeBroadcaster());
      await consumer.onModuleInit();
      await consumer.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a valid market tick message is received', () => {
    it('should broadcast the parsed event', async () => {
      const broadcaster = makeBroadcaster();
      const consumer = new KafkaMarketTickConsumer(broadcaster);
      await consumer.onModuleInit();
      const tick = makeTick();
      await capturedEachMessage!({ message: { value: Buffer.from(JSON.stringify(tick)) } });
      expect(broadcaster.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'AAPL', eventType: 'market.tick' }),
      );
    });
  });

  describe('when a message with null value is received', () => {
    it('should not broadcast anything', async () => {
      const broadcaster = makeBroadcaster();
      const consumer = new KafkaMarketTickConsumer(broadcaster);
      await consumer.onModuleInit();
      await capturedEachMessage!({ message: { value: null } });
      expect(broadcaster.broadcast).not.toHaveBeenCalled();
    });
  });

  describe('when a malformed message is received', () => {
    it('should not broadcast and should not throw', async () => {
      const broadcaster = makeBroadcaster();
      const consumer = new KafkaMarketTickConsumer(broadcaster);
      await consumer.onModuleInit();
      await expect(
        capturedEachMessage!({ message: { value: Buffer.from('not-json{') } }),
      ).resolves.toBeUndefined();
      expect(broadcaster.broadcast).not.toHaveBeenCalled();
    });
  });
});

describe('Given a KafkaMarketTickConsumer without KAFKA_BROKER set', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['KAFKA_BROKER'];
  });

  describe('when onModuleInit is called', () => {
    it('should not connect to Kafka', async () => {
      const consumer = new KafkaMarketTickConsumer(makeBroadcaster());
      await consumer.onModuleInit();
      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should not disconnect', async () => {
      const consumer = new KafkaMarketTickConsumer(makeBroadcaster());
      await consumer.onModuleDestroy();
      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });
});
