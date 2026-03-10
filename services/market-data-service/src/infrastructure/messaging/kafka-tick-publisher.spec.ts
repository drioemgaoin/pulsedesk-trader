import { KafkaTickPublisher } from './kafka-tick-publisher';
import { Tick } from '../../domain/tick';
import type { ITickMetrics } from '../../application/ports/metrics.port';

const mockSend = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockProducer = { connect: mockConnect, disconnect: mockDisconnect, send: mockSend };

const mockAdminConnect = jest.fn().mockResolvedValue(undefined);
const mockAdminDisconnect = jest.fn().mockResolvedValue(undefined);
const mockCreateTopics = jest.fn().mockResolvedValue(true);
const mockAdmin = {
  connect: mockAdminConnect,
  disconnect: mockAdminDisconnect,
  createTopics: mockCreateTopics,
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue(mockProducer),
    admin: jest.fn().mockReturnValue(mockAdmin),
  })),
}));

const makeMetrics = (): jest.Mocked<ITickMetrics> => ({
  incrementEmitted: jest.fn(),
  incrementRejected: jest.fn(),
  incrementPublishFailed: jest.fn(),
});

const makeTick = (): Tick =>
  Tick.create({ symbol: 'AAPL', bid: 174.99, ask: 175.01, last: 175.0, volume: 1000 });

describe('Given a KafkaTickPublisher instance', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('when onModuleInit is called', () => {
    it('should create the topic with 10 partitions before connecting the producer', async () => {
      const publisher = new KafkaTickPublisher(makeMetrics());
      await publisher.onModuleInit();
      expect(mockCreateTopics).toHaveBeenCalledWith(
        expect.objectContaining({
          topics: expect.arrayContaining([
            expect.objectContaining({ numPartitions: 10 }),
          ]),
        }),
      );
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect the admin client after topic creation regardless of outcome', async () => {
      const publisher = new KafkaTickPublisher(makeMetrics());
      await publisher.onModuleInit();
      expect(mockAdminDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should disconnect the Kafka producer', async () => {
      const publisher = new KafkaTickPublisher(makeMetrics());
      await publisher.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when publish is called with a valid tick', () => {
    it('should send to the topic with the correct explicit partition', async () => {
      const publisher = new KafkaTickPublisher(makeMetrics());
      await publisher.publish(makeTick(), 3);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ partition: 3 }),
          ]),
        }),
      );
    });

    it('should include eventType and schemaVersion headers', async () => {
      const publisher = new KafkaTickPublisher(makeMetrics());
      await publisher.publish(makeTick(), 0);
      const msg = (mockSend.mock.calls[0][0] as { messages: { headers: Record<string, string> }[] }).messages[0];
      expect(msg.headers).toMatchObject({ eventType: 'market.tick', schemaVersion: '1' });
    });

    it('should serialize the tick as a MarketTickEvent JSON value', async () => {
      const publisher = new KafkaTickPublisher(makeMetrics());
      const tick = makeTick();
      await publisher.publish(tick, 0);
      const raw = (mockSend.mock.calls[0][0] as { messages: { value: string }[] }).messages[0].value;
      const value = JSON.parse(raw) as Record<string, unknown>;
      expect(value['eventType']).toBe('market.tick');
      expect(value['symbol']).toBe('AAPL');
      expect(value['schemaVersion']).toBe(1);
    });
  });

  describe('when the Kafka producer throws on send', () => {
    it('should increment the publishFailed counter and not rethrow', async () => {
      const metrics = makeMetrics();
      mockSend.mockRejectedValueOnce(new Error('broker unavailable'));
      const publisher = new KafkaTickPublisher(metrics);
      await expect(publisher.publish(makeTick(), 0)).resolves.toBeUndefined();
      expect(metrics.incrementPublishFailed).toHaveBeenCalledTimes(1);
    });

    it('should not increment emitted when publish fails', async () => {
      const metrics = makeMetrics();
      mockSend.mockRejectedValueOnce(new Error('broker unavailable'));
      const publisher = new KafkaTickPublisher(metrics);
      await publisher.publish(makeTick(), 0);
      expect(metrics.incrementEmitted).not.toHaveBeenCalled();
    });
  });
});
