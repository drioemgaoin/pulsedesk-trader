import { KafkaOrderEventPublisher } from './kafka-order-event-publisher';
import { Order } from '../../domain/order.entity';
import { OrderSide } from '../../domain/enums/order-side.enum';
import { OrderType } from '../../domain/enums/order-type.enum';

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

const makeAcceptedOrder = (): Order =>
  Order.create({
    id: 'order-1',
    commandId: 'cmd-1',
    accountId: 'acc-001',
    symbol: 'AAPL',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    quantity: 10,
    limitPrice: 150,
  }).accept();

describe('Given a KafkaOrderEventPublisher instance', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('when onModuleInit is called', () => {
    it('should create the topic with 10 partitions before connecting the producer', async () => {
      const publisher = new KafkaOrderEventPublisher();
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
      const publisher = new KafkaOrderEventPublisher();
      await publisher.onModuleInit();
      expect(mockAdminDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when onModuleDestroy is called', () => {
    it('should disconnect the Kafka producer', async () => {
      const publisher = new KafkaOrderEventPublisher();
      await publisher.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('when publishAccepted is called with an ACCEPTED order', () => {
    it('should send to the order events topic with eventType and schemaVersion headers', async () => {
      const publisher = new KafkaOrderEventPublisher();
      await publisher.publishAccepted(makeAcceptedOrder());
      const call = mockSend.mock.calls[0][0] as { topic: string; messages: { headers: Record<string, string> }[] };
      expect(call.topic).toBe('orders.events.v1');
      expect(call.messages[0].headers).toMatchObject({ eventType: 'order.submitted', schemaVersion: '1' });
    });

    it('should use the orderId as the message key for deterministic partitioning', async () => {
      const publisher = new KafkaOrderEventPublisher();
      const order = makeAcceptedOrder();
      await publisher.publishAccepted(order);
      const call = mockSend.mock.calls[0][0] as { messages: { key: string }[] };
      expect(call.messages[0].key).toBe(order.id);
    });

    it('should serialize the event payload with required execution fields', async () => {
      const publisher = new KafkaOrderEventPublisher();
      const order = makeAcceptedOrder();
      await publisher.publishAccepted(order);
      const raw = (mockSend.mock.calls[0][0] as { messages: { value: string }[] }).messages[0].value;
      const payload = JSON.parse(raw) as Record<string, unknown>;
      expect(payload['eventType']).toBe('order.submitted');
      expect(payload['schemaVersion']).toBe(1);
      expect(payload['orderId']).toBe('order-1');
      expect(payload['accountId']).toBe('acc-001');
      expect(payload['symbol']).toBe('AAPL');
      expect(payload['side']).toBe(OrderSide.BUY);
      expect(payload['type']).toBe(OrderType.LIMIT);
      expect(payload['quantity']).toBe(10);
      expect(payload['limitPrice']).toBe(150);
      expect(typeof payload['timestamp']).toBe('string');
    });

    it('should use commandId as the idempotencyKey', async () => {
      const publisher = new KafkaOrderEventPublisher();
      await publisher.publishAccepted(makeAcceptedOrder());
      const raw = (mockSend.mock.calls[0][0] as { messages: { value: string }[] }).messages[0].value;
      const payload = JSON.parse(raw) as Record<string, unknown>;
      expect(payload['idempotencyKey']).toBe('cmd-1');
    });
  });

  describe('when the Kafka producer throws on send', () => {
    it('should log the error and not rethrow (order already persisted)', async () => {
      mockSend.mockRejectedValueOnce(new Error('broker unavailable'));
      const publisher = new KafkaOrderEventPublisher();
      await expect(publisher.publishAccepted(makeAcceptedOrder())).resolves.toBeUndefined();
    });
  });
});

describe('Given a PENDING order (not yet accepted)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('when publishAccepted is called with a PENDING order', () => {
    it('should still send without throwing (caller is responsible for status guard)', async () => {
      const pendingOrder = Order.create({
        id: 'order-2',
        commandId: 'cmd-2',
        accountId: 'acc-001',
        symbol: 'MSFT',
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        quantity: 5,
      });
      const publisher = new KafkaOrderEventPublisher();
      await expect(publisher.publishAccepted(pendingOrder)).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
      const raw = (mockSend.mock.calls[0][0] as { messages: { value: string }[] }).messages[0].value;
      const payload = JSON.parse(raw) as Record<string, unknown>;
      expect(payload['orderId']).toBe('order-2');
    });
  });
});
