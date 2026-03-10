import { KafkaFillEventPublisher } from './kafka-fill-event-publisher';
import { Execution } from '../../domain/execution.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';

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

const makeExecution = (): Execution =>
  new Execution({
    id: 'exec-1',
    idempotencyKey: 'order-1',
    orderId: 'order-1',
    accountId: 'acc-001',
    symbol: 'AAPL',
    side: OrderSide.BUY,
    filledQuantity: 10,
    fillPrice: 150,
    filledAt: '2026-03-10T00:00:00.000Z',
  });

describe('Given a KafkaFillEventPublisher instance', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('when onModuleInit is called', () => {
    it('should create the topic before connecting the producer', async () => {
      const publisher = new KafkaFillEventPublisher();
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

    it('should disconnect the admin client after topic creation', async () => {
      const publisher = new KafkaFillEventPublisher();
      await publisher.onModuleInit();
      expect(mockAdminDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should disconnect the Kafka producer', async () => {
      const publisher = new KafkaFillEventPublisher();
      await publisher.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when publishFill is called', () => {
    it('should send to execution.events.v1 with correct headers', async () => {
      const publisher = new KafkaFillEventPublisher();
      await publisher.publishFill(makeExecution());
      const call = mockSend.mock.calls[0][0] as { topic: string; messages: { headers: Record<string, string> }[] };
      expect(call.topic).toBe('execution.events.v1');
      expect(call.messages[0].headers).toMatchObject({ eventType: 'execution.filled', schemaVersion: '1' });
    });

    it('should use orderId as the message key', async () => {
      const publisher = new KafkaFillEventPublisher();
      const exec = makeExecution();
      await publisher.publishFill(exec);
      const call = mockSend.mock.calls[0][0] as { messages: { key: string }[] };
      expect(call.messages[0].key).toBe(exec.orderId);
    });

    it('should serialize the event payload with required fields', async () => {
      const publisher = new KafkaFillEventPublisher();
      const exec = makeExecution();
      await publisher.publishFill(exec);
      const raw = (mockSend.mock.calls[0][0] as { messages: { value: string }[] }).messages[0].value;
      const payload = JSON.parse(raw) as Record<string, unknown>;
      expect(payload['eventType']).toBe('execution.filled');
      expect(payload['schemaVersion']).toBe(1);
      expect(payload['executionId']).toBe('exec-1');
      expect(payload['orderId']).toBe('order-1');
      expect(payload['accountId']).toBe('acc-001');
      expect(payload['symbol']).toBe('AAPL');
      expect(payload['filledQuantity']).toBe(10);
      expect(payload['fillPrice']).toBe(150);
      expect(typeof payload['timestamp']).toBe('string');
    });
  });
});
