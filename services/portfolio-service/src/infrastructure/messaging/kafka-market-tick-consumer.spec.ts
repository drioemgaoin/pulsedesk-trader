/**
 * Spec — KafkaMarketTickConsumer (field validation + cache write, SEC-M8-T1-05)
 *
 * Scope: verifies that malformed ticks (invalid symbol, non-finite last price)
 * are silently skipped and that valid ticks update the price cache.
 */

import { KafkaMarketTickConsumer } from './kafka-market-tick-consumer';
import { IMarketPriceCache } from '../../domain/ports/market-price-cache.port';

// ---------------------------------------------------------------------------
// KafkaJS mock
// ---------------------------------------------------------------------------

type EachMessageHandler = (ctx: unknown) => Promise<void>;
let capturedHandler: EachMessageHandler | null = null;

const mockRun = jest.fn().mockImplementation(
  ({ eachMessage }: { eachMessage: EachMessageHandler }) => {
    capturedHandler = eachMessage;
    return Promise.resolve();
  },
);

const mockConsumer = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  run: mockRun,
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue(mockConsumer),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCache = (): jest.Mocked<IMarketPriceCache> => ({
  setPrice: jest.fn(),
  getPrice: jest.fn(),
});

const makeCtx = (value: string | null) => ({
  message: { value: value !== null ? Buffer.from(value) : null },
  partition: 0,
  topic: 'market.ticks.v1',
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('KafkaMarketTickConsumer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedHandler = null;
  });

  describe('when a valid tick is received', () => {
    it('should write the price to the cache', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(JSON.stringify({ symbol: 'AAPL', last: 175.5 })));

      expect(cache.setPrice).toHaveBeenCalledWith('AAPL', 175.5);
    });
  });

  describe('when a message with a null value is received', () => {
    it('should not update the cache', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(null));

      expect(cache.setPrice).not.toHaveBeenCalled();
    });
  });

  describe('when a malformed (non-JSON) message is received', () => {
    it('should not update the cache', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx('{invalid'));

      expect(cache.setPrice).not.toHaveBeenCalled();
    });
  });

  describe('when a tick has an empty symbol', () => {
    it('should not update the cache', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(JSON.stringify({ symbol: '', last: 100 })));

      expect(cache.setPrice).not.toHaveBeenCalled();
    });
  });

  describe('when a tick has a NaN last price', () => {
    it('should not update the cache', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(JSON.stringify({ symbol: 'AAPL', last: NaN })));

      expect(cache.setPrice).not.toHaveBeenCalled();
    });
  });

  describe('when a tick has an Infinity last price', () => {
    it('should not update the cache', async () => {
      const cache = makeCache();
      const consumer = new KafkaMarketTickConsumer(cache);
      await consumer.onModuleInit();
      await capturedHandler!(makeCtx(JSON.stringify({ symbol: 'AAPL', last: Infinity })));

      expect(cache.setPrice).not.toHaveBeenCalled();
    });
  });
});
