/**
 * Contract tests — WS stream message protocol
 *
 * Verifies that the gateway produces payloads that match the published
 * contract types: SubscribedAckV1 (ack) and MarketTickEvent (broadcast).
 */
import { MarketStreamGateway } from './market-stream.gateway';
import type { MarketTickEvent, SubscribedAckV1 } from '@pulsedesk/contracts';
import { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

const WS_OPEN = 1;

const makeClient = (): jest.Mocked<WebSocket> =>
  ({ send: jest.fn(), terminate: jest.fn(), close: jest.fn(), readyState: WS_OPEN } as unknown as jest.Mocked<WebSocket>);

const makeRequest = (): IncomingMessage =>
  ({ url: '/', headers: {} } as unknown as IncomingMessage);

const parseSend = <T>(client: jest.Mocked<WebSocket>, callIndex = 0): T =>
  JSON.parse((client.send as jest.Mock).mock.calls[callIndex][0] as string) as T;

describe('MarketStreamGateway — WS protocol contract', () => {
  let gateway: MarketStreamGateway;

  beforeEach(() => {
    gateway = new MarketStreamGateway();
    delete process.env['JWT_SECRET']; // dev mode — no auth
  });

  describe('subscribe ack', () => {
    it('should return a SubscribedAckV1 shape with event="subscribed" and data.symbols array', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest());
      gateway.handleSubscribe({ symbols: ['AAPL', 'MSFT'] }, client);

      const ack = parseSend<SubscribedAckV1>(client);
      expect(ack.event).toBe('subscribed');
      expect(Array.isArray(ack.data.symbols)).toBe(true);
      expect(ack.data.symbols.sort()).toEqual(['AAPL', 'MSFT']);
    });

    it('should return a SubscribedAckV1 shape after unsubscribe with the remaining symbols', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest());
      gateway.handleSubscribe({ symbols: ['AAPL', 'MSFT', 'TSLA'] }, client);
      gateway.handleUnsubscribe({ symbols: ['MSFT'] }, client);

      const ack = parseSend<SubscribedAckV1>(client, 1); // second send = unsubscribe ack
      expect(ack.event).toBe('subscribed');
      expect(ack.data.symbols.sort()).toEqual(['AAPL', 'TSLA']);
    });
  });

  describe('broadcast payload', () => {
    it('should emit a MarketTickEvent-shaped payload to subscribed clients', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest());
      gateway.handleSubscribe({ symbols: ['TSLA'] }, client);

      const mockServer = { clients: new Set([client]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      const tick: MarketTickEvent = {
        eventType: 'market.tick',
        schemaVersion: 1,
        symbol: 'TSLA',
        bid: 199.5,
        ask: 200.0,
        last: 199.75,
        volume: 1200,
        timestamp: '2026-03-11T00:00:00.000Z',
      };

      jest.clearAllMocks();
      gateway.broadcast(tick);

      const [payload] = (client.send as jest.Mock).mock.calls[0] as [string];
      const emitted = JSON.parse(payload) as MarketTickEvent;

      expect(emitted.eventType).toBe('market.tick');
      expect(typeof emitted.schemaVersion).toBe('number');
      expect(typeof emitted.symbol).toBe('string');
      expect(typeof emitted.bid).toBe('number');
      expect(typeof emitted.ask).toBe('number');
      expect(typeof emitted.last).toBe('number');
      expect(typeof emitted.volume).toBe('number');
      expect(typeof emitted.timestamp).toBe('string');
    });
  });
});
