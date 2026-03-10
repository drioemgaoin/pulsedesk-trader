import { KafkaMarketTickConsumer } from './kafka-market-tick-consumer';
import { IMarketPriceCache } from '../../domain/ports/market-price-cache.port';

let capturedEachMessage: ((ctx: unknown) => Promise<void>) | null = null;
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockRun = jest.fn().mockImplementation(({ eachMessage }: { eachMessage: (ctx: unknown) => Promise<void> }) => {
  capturedEachMessage = eachMessage;
  return Promise.resolve();
});
const mockConsumer = { connect: mockConnect, disconnect: mockDisconnect, subscribe: mockSubscribe, run: mockRun };

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue(mockConsumer),
  })),
}));

const makeCache = (): jest.Mocked<IMarketPriceCache> => ({
  getPrice: jest.fn(),
  setPrice: jest.fn(),
});

const makeCtx = (value: string | null) => ({
  message: { value: value ? Buffer.from(value) : null },
});

describe('Given a KafkaMarketTickConsumer instance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedEachMessage = null;
  });

  describe('when onModuleInit is called', () => {
    it('should connect and subscribe to the market ticks topic', async () => {
      const consumer = new KafkaMarketTickConsumer(makeCache());
      await consumer.onModuleInit();
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(expect.objectContaining({ topic: 'market.ticks.v1' }));
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should disconnect the consumer', async () => {
      const consumer = new KafkaMarketTickConsumer(makeCache());
      await consumer.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a valid MarketTickEvent is received', () => {
    it('should update the price cache with the last price', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      const tick = { eventType: 'market.tick', schemaVersion: 1, symbol: 'AAPL', bid: 149, ask: 151, last: 150, volume: 1000, timestamp: '2026-03-10T00:00:00.000Z' };
      await capturedEachMessage!(makeCtx(JSON.stringify(tick)));
      expect(cache.setPrice).toHaveBeenCalledWith('AAPL', 150);
    });
  });

  describe('when a message with null value is received', () => {
    it('should not update the cache', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      await capturedEachMessage!(makeCtx(null));
      expect(cache.setPrice).not.toHaveBeenCalled();
    });
  });

  describe('when a malformed message is received', () => {
    it('should skip silently without updating the cache', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      await capturedEachMessage!(makeCtx('not-json'));
      expect(cache.setPrice).not.toHaveBeenCalled();
    });
  });
});
