/**
 * M5-T4 — End-to-end consistency tests: notification-service WS gateway
 *
 * Scope: query/read-model consistency and reconnect/resubscribe correctness
 *        at the WS gateway boundary.
 *
 * Approach: instantiate MarketStreamGateway directly (no live NestJS server);
 *           inject a synthetic server.clients set to exercise broadcast routing.
 */

import { MarketStreamGateway } from './market-stream.gateway';
import type { MarketTickEvent } from '@pulsedesk/contracts';
import { WebSocket } from 'ws';
import { sign } from 'jsonwebtoken';
import type { IncomingMessage } from 'http';

const TEST_SECRET = 'test-secret-t4';
const makeToken = () => sign({ sub: 'acc-001' }, TEST_SECRET, { expiresIn: '1h' });

const makeTick = (symbol = 'AAPL', last = 175.0): MarketTickEvent => ({
  eventType: 'market.tick',
  schemaVersion: 1,
  symbol,
  bid: last - 0.01,
  ask: last + 0.01,
  last,
  volume: 1000,
  timestamp: new Date().toISOString(),
});

function makeClient(readyState: number = WebSocket.OPEN): jest.Mocked<WebSocket> {
  // send must invoke its callback so the gateway can increment messagesSent
  const sendMock = jest.fn((_data: unknown, cb?: (err?: Error) => void) => {
    if (typeof cb === 'function') cb(undefined);
  });
  return { send: sendMock, terminate: jest.fn(), close: jest.fn(), readyState } as unknown as jest.Mocked<WebSocket>;
}

function makeAuthRequest(token: string): IncomingMessage {
  return { url: `/?token=${encodeURIComponent(token)}`, headers: {} } as unknown as IncomingMessage;
}

/** Injects a fake server.clients set so broadcast() iterates the provided clients.
 *  Also clears send mocks so handleSubscribe ack calls don't pollute broadcast assertions. */
function injectClients(gateway: MarketStreamGateway, clients: jest.Mocked<WebSocket>[]): void {
  const fakeServer = { clients: new Set(clients) };
  Object.defineProperty(gateway, 'server', { value: fakeServer, writable: true, configurable: true });
  clients.forEach((c) => (c.send as jest.Mock).mockClear());
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function connectAndSubscribe(gateway: MarketStreamGateway, client: jest.Mocked<WebSocket>, symbols: string[]): void {
  gateway.handleConnection(client, makeAuthRequest(makeToken()));
  gateway.handleSubscribe({ symbols }, client);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('MarketStreamGateway — consistency', () => {
  let gateway: MarketStreamGateway;
  const originalSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    process.env['JWT_SECRET'] = TEST_SECRET;
    gateway = new MarketStreamGateway();
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env['JWT_SECRET'] = originalSecret;
    } else {
      delete process.env['JWT_SECRET'];
    }
  });

  // ── AC1: Query / read-model consistency — tick delivery to subscribed clients ──

  describe('when a tick is broadcast for a subscribed symbol', () => {
    it('should deliver the tick only to the client subscribed to that symbol', () => {
      const clientA = makeClient();
      const clientB = makeClient();
      connectAndSubscribe(gateway, clientA, ['AAPL']);
      connectAndSubscribe(gateway, clientB, ['TSLA']);
      injectClients(gateway, [clientA, clientB]);

      gateway.broadcast(makeTick('AAPL'));

      expect(clientA.send).toHaveBeenCalledTimes(1);
      expect(clientB.send).not.toHaveBeenCalled();
    });

    it('should deliver the correct tick payload to the subscribed client', () => {
      const client = makeClient();
      connectAndSubscribe(gateway, client, ['AAPL']);
      injectClients(gateway, [client]);

      const tick = makeTick('AAPL', 180.5);
      gateway.broadcast(tick);

      const payload = JSON.parse((client.send as jest.Mock).mock.calls[0][0] as string) as MarketTickEvent;
      expect(payload.symbol).toBe('AAPL');
      expect(payload.last).toBe(180.5);
      expect(payload.eventType).toBe('market.tick');
    });

    it('should not deliver a tick to a client subscribed to a different symbol', () => {
      const client = makeClient();
      connectAndSubscribe(gateway, client, ['MSFT']);
      injectClients(gateway, [client]);

      gateway.broadcast(makeTick('AAPL'));

      expect(client.send).not.toHaveBeenCalled();
    });

    it('should deliver to all clients subscribed to the broadcast symbol', () => {
      const c1 = makeClient();
      const c2 = makeClient();
      const c3 = makeClient(); // subscribed to different symbol
      connectAndSubscribe(gateway, c1, ['NVDA']);
      connectAndSubscribe(gateway, c2, ['NVDA']);
      connectAndSubscribe(gateway, c3, ['TSLA']);
      injectClients(gateway, [c1, c2, c3]);

      gateway.broadcast(makeTick('NVDA'));

      expect(c1.send).toHaveBeenCalledTimes(1);
      expect(c2.send).toHaveBeenCalledTimes(1);
      expect(c3.send).not.toHaveBeenCalled();
    });

    it('should deliver multiple ticks independently with no cross-contamination', () => {
      const clientAAPL = makeClient();
      const clientTSLA = makeClient();
      connectAndSubscribe(gateway, clientAAPL, ['AAPL']);
      connectAndSubscribe(gateway, clientTSLA, ['TSLA']);
      injectClients(gateway, [clientAAPL, clientTSLA]);

      gateway.broadcast(makeTick('AAPL', 175));
      gateway.broadcast(makeTick('TSLA', 200));
      gateway.broadcast(makeTick('AAPL', 176));

      expect(clientAAPL.send).toHaveBeenCalledTimes(2);
      expect(clientTSLA.send).toHaveBeenCalledTimes(1);
      const tslaPayload = JSON.parse((clientTSLA.send as jest.Mock).mock.calls[0][0] as string) as MarketTickEvent;
      expect(tslaPayload.symbol).toBe('TSLA');
    });
  });

  // ── AC2: Reconnect / resubscribe does not duplicate or lose updates ──────────

  describe('when a client disconnects and reconnects', () => {
    it('should not deliver ticks during the disconnected window', () => {
      const client = makeClient();
      connectAndSubscribe(gateway, client, ['AAPL']);
      injectClients(gateway, [client]);

      // Disconnect
      gateway.handleDisconnect(client);
      injectClients(gateway, []); // client no longer in server.clients

      gateway.broadcast(makeTick('AAPL'));
      expect(client.send).not.toHaveBeenCalled();
    });

    it('should resume delivery after reconnect and re-subscribe with no duplicates', () => {
      const client = makeClient();
      connectAndSubscribe(gateway, client, ['AAPL']);
      injectClients(gateway, [client]);

      // Tick before disconnect
      gateway.broadcast(makeTick('AAPL', 175));
      expect(client.send).toHaveBeenCalledTimes(1);

      // Disconnect
      gateway.handleDisconnect(client);
      injectClients(gateway, []);
      gateway.broadcast(makeTick('AAPL', 176)); // missed during gap

      // Reconnect: new socket object (same mock for simplicity, reset call count)
      const reconnectedClient = makeClient();
      connectAndSubscribe(gateway, reconnectedClient, ['AAPL']);
      injectClients(gateway, [reconnectedClient]);

      // Tick after reconnect
      gateway.broadcast(makeTick('AAPL', 177));
      expect(reconnectedClient.send).toHaveBeenCalledTimes(1); // only the post-reconnect tick

      const delivered = JSON.parse(
        (reconnectedClient.send as jest.Mock).mock.calls[0][0] as string,
      ) as MarketTickEvent;
      expect(delivered.last).toBe(177); // not 175 or 176 (no replay of missed ticks — by design)
    });

    it('should not accumulate stale subscriptions after disconnect', () => {
      const client = makeClient();
      connectAndSubscribe(gateway, client, ['AAPL', 'TSLA']);
      expect(gateway.getMetrics().activeConnections).toBe(1);

      gateway.handleDisconnect(client);
      expect(gateway.getMetrics().activeConnections).toBe(0);

      // Re-subscribe with new client subscribing to TSLA only
      const newClient = makeClient();
      connectAndSubscribe(gateway, newClient, ['TSLA']);
      injectClients(gateway, [newClient]);

      gateway.broadcast(makeTick('AAPL')); // old client's symbol
      gateway.broadcast(makeTick('TSLA')); // new client's symbol

      expect(newClient.send).toHaveBeenCalledTimes(1); // only TSLA delivered
    });

    it('should not deliver duplicate ticks when the same symbol is re-subscribed', () => {
      const client = makeClient();
      connectAndSubscribe(gateway, client, ['AAPL']);

      // Re-subscribe to the same symbol (idempotent)
      gateway.handleSubscribe({ symbols: ['AAPL'] }, client);
      injectClients(gateway, [client]);

      gateway.broadcast(makeTick('AAPL'));

      // Should deliver exactly once regardless of how many times subscribed
      expect(client.send).toHaveBeenCalledTimes(1);
    });
  });

  // ── AC1 extended: Kafka consumer → broadcast consistency ────────────────────

  describe('when ticks arrive from the Kafka consumer (via broadcaster port)', () => {
    it('should increment messagesSent counter for each delivered tick', () => {
      const client = makeClient();
      connectAndSubscribe(gateway, client, ['AAPL']);
      injectClients(gateway, [client]);

      gateway.broadcast(makeTick('AAPL', 175));
      gateway.broadcast(makeTick('AAPL', 176));

      expect(gateway.getMetrics().messagesSent).toBe(2);
    });

    it('should not increment messagesSent for ticks filtered out by subscription', () => {
      const client = makeClient();
      connectAndSubscribe(gateway, client, ['TSLA']);
      injectClients(gateway, [client]);

      gateway.broadcast(makeTick('AAPL')); // not subscribed

      expect(gateway.getMetrics().messagesSent).toBe(0);
    });

    it('should track dropped messages when write buffer is full', () => {
      const client = makeClient();
      // Simulate full write buffer (> 64 KiB)
      (client as unknown as { _socket: { writableLength: number } })._socket = { writableLength: 65_537 };
      connectAndSubscribe(gateway, client, ['AAPL']);
      injectClients(gateway, [client]);

      gateway.broadcast(makeTick('AAPL'));

      expect(client.send).not.toHaveBeenCalled();
      expect(gateway.getMetrics().droppedMessages).toBe(1);
    });
  });
});
