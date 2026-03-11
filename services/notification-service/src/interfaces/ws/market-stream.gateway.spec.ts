import { MarketStreamGateway } from './market-stream.gateway';
import type { MarketTickEvent } from '@pulsedesk/contracts';
import { WebSocket } from 'ws';
import { sign } from 'jsonwebtoken';
import type { IncomingMessage } from 'http';

const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

const TEST_SECRET = 'test-secret';
const makeToken = () => sign({ sub: 'acc-001' }, TEST_SECRET, { expiresIn: '1h' });

const makeTick = (symbol = 'TSLA'): MarketTickEvent => ({
  eventType: 'market.tick',
  schemaVersion: 1,
  symbol,
  bid: 200.0,
  ask: 200.5,
  last: 200.25,
  volume: 500,
  timestamp: new Date().toISOString(),
});

const makeClient = (readyState: number = WS_OPEN): jest.Mocked<WebSocket> =>
  ({ send: jest.fn(), terminate: jest.fn(), close: jest.fn(), readyState } as unknown as jest.Mocked<WebSocket>);

const makeRequest = (url = '/'): IncomingMessage =>
  ({ url, headers: {} } as unknown as IncomingMessage);

const makeAuthRequest = (token: string): IncomingMessage =>
  ({ url: `/?token=${token}`, headers: {} } as unknown as IncomingMessage);

describe('Given a MarketStreamGateway instance', () => {
  let gateway: MarketStreamGateway;
  const originalSecret = process.env['JWT_SECRET'];

  beforeEach(() => {
    gateway = new MarketStreamGateway();
    delete process.env['JWT_SECRET'];
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env['JWT_SECRET'] = originalSecret;
    } else {
      delete process.env['JWT_SECRET'];
    }
  });

  // ---- Authentication -------------------------------------------------------

  describe('when JWT_SECRET is set', () => {
    beforeEach(() => { process.env['JWT_SECRET'] = TEST_SECRET; });

    describe('and a client connects with a valid token', () => {
      it('should accept the connection and initialise subscription state', () => {
        const client = makeClient();
        gateway.handleConnection(client, makeAuthRequest(makeToken()));
        expect(client.close).not.toHaveBeenCalled();
        expect(gateway.getMetrics().activeConnections).toBe(1);
      });
    });

    describe('and a client connects with no token', () => {
      it('should close the connection with code 4401', () => {
        const client = makeClient();
        gateway.handleConnection(client, makeRequest('/'));
        expect(client.close).toHaveBeenCalledWith(4401, 'Unauthorized');
        expect(gateway.getMetrics().activeConnections).toBe(0);
      });
    });

    describe('and a client connects with an invalid token', () => {
      it('should close the connection with code 4401', () => {
        const client = makeClient();
        gateway.handleConnection(client, makeAuthRequest('not.a.valid.jwt'));
        expect(client.close).toHaveBeenCalledWith(4401, 'Unauthorized');
        expect(gateway.getMetrics().activeConnections).toBe(0);
      });
    });

    describe('and a client connects with an expired token', () => {
      it('should close the connection with code 4401', () => {
        const expired = sign({ sub: 'acc-001' }, TEST_SECRET, { expiresIn: -1 });
        const client = makeClient();
        gateway.handleConnection(client, makeAuthRequest(expired));
        expect(client.close).toHaveBeenCalledWith(4401, 'Unauthorized');
        expect(gateway.getMetrics().activeConnections).toBe(0);
      });
    });

    describe('and a client passes the token via Authorization header', () => {
      it('should accept the connection', () => {
        const client = makeClient();
        const req = {
          url: '/',
          headers: { authorization: `Bearer ${makeToken()}` },
        } as unknown as IncomingMessage;
        gateway.handleConnection(client, req);
        expect(client.close).not.toHaveBeenCalled();
        expect(gateway.getMetrics().activeConnections).toBe(1);
      });
    });
  });

  describe('when JWT_SECRET is not set (dev/test mode)', () => {
    it('should accept the connection without a token', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      expect(client.close).not.toHaveBeenCalled();
      expect(gateway.getMetrics().activeConnections).toBe(1);
    });
  });

  // ---- Connection lifecycle --------------------------------------------------

  describe('when a client connects', () => {
    it('should increment active_connections and initialise an empty subscription set', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      expect(gateway.getMetrics().activeConnections).toBe(1);
    });
  });

  describe('when a client disconnects', () => {
    it('should decrement active_connections and remove its subscription entry', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleConnection(makeClient(), makeRequest('/'));
      gateway.handleDisconnect(client);
      expect(gateway.getMetrics().activeConnections).toBe(1);
    });
  });

  // ---- Subscription management ----------------------------------------------

  describe('when a client subscribes to symbols', () => {
    it('should send a subscribed ack with the current symbol set', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleSubscribe({ symbols: ['aapl', 'TSLA'] }, client);

      const sent = JSON.parse((client.send as jest.Mock).mock.calls[0][0] as string) as {
        event: string;
        data: { symbols: string[] };
      };
      expect(sent.event).toBe('subscribed');
      expect(sent.data.symbols.sort()).toEqual(['AAPL', 'TSLA']);
    });

    it('should normalise symbols to uppercase and trim whitespace', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleSubscribe({ symbols: [' msft ', 'aapl'] }, client);

      const sent = JSON.parse((client.send as jest.Mock).mock.calls[0][0] as string) as {
        data: { symbols: string[] };
      };
      expect(sent.data.symbols.sort()).toEqual(['AAPL', 'MSFT']);
    });

    it('should silently discard symbols exceeding MAX_SYMBOL_LENGTH (10 chars)', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleSubscribe({ symbols: ['AAPL', 'VERYLONGSYMBOLNAME'] }, client);

      const sent = JSON.parse((client.send as jest.Mock).mock.calls[0][0] as string) as {
        data: { symbols: string[] };
      };
      expect(sent.data.symbols).toEqual(['AAPL']);
    });

    it('should cap subscription set at MAX_SYMBOLS_PER_CLIENT (50)', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      const lotsOfSymbols = Array.from({ length: 60 }, (_, i) => `SYM${i}`);
      gateway.handleSubscribe({ symbols: lotsOfSymbols }, client);

      const sent = JSON.parse((client.send as jest.Mock).mock.calls[0][0] as string) as {
        data: { symbols: string[] };
      };
      expect(sent.data.symbols.length).toBeLessThanOrEqual(50);
    });

    it('should ignore subscribe with invalid payload (no symbols array)', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleSubscribe(null, client);
      gateway.handleSubscribe({ symbols: 'not-an-array' }, client);
      expect(client.send).not.toHaveBeenCalled();
    });
  });

  describe('when a client unsubscribes from a symbol', () => {
    it('should remove the symbol and ack the remaining set', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleSubscribe({ symbols: ['AAPL', 'TSLA'] }, client);
      jest.clearAllMocks();
      gateway.handleUnsubscribe({ symbols: ['AAPL'] }, client);

      const sent = JSON.parse((client.send as jest.Mock).mock.calls[0][0] as string) as {
        event: string;
        data: { symbols: string[] };
      };
      expect(sent.event).toBe('subscribed');
      expect(sent.data.symbols).toEqual(['TSLA']);
    });

    it('should ignore unsubscribe with invalid payload', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleUnsubscribe(null, client);
      expect(client.send).not.toHaveBeenCalled();
    });
  });

  // ---- Broadcast filtering ---------------------------------------------------

  describe('when broadcast is called', () => {
    it('should only send to clients subscribed to the event symbol', () => {
      const aaplClient = makeClient();
      const tslaClient = makeClient();
      const unsubClient = makeClient();

      gateway.handleConnection(aaplClient, makeRequest('/'));
      gateway.handleConnection(tslaClient, makeRequest('/'));
      gateway.handleConnection(unsubClient, makeRequest('/'));

      gateway.handleSubscribe({ symbols: ['AAPL'] }, aaplClient);
      gateway.handleSubscribe({ symbols: ['TSLA'] }, tslaClient);

      const mockServer = { clients: new Set([aaplClient, tslaClient, unsubClient]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      jest.clearAllMocks();
      gateway.broadcast(makeTick('AAPL'));

      expect(aaplClient.send).toHaveBeenCalledTimes(1);
      expect(tslaClient.send).not.toHaveBeenCalled();
      expect(unsubClient.send).not.toHaveBeenCalled();
    });

    it('should serialise the event as JSON', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleSubscribe({ symbols: ['TSLA'] }, client);
      const mockServer = { clients: new Set([client]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      jest.clearAllMocks();
      gateway.broadcast(makeTick('TSLA'));

      const [payload] = (client.send as jest.Mock).mock.calls[0] as [string];
      const parsed = JSON.parse(payload) as MarketTickEvent;
      expect(parsed.symbol).toBe('TSLA');
      expect(parsed.eventType).toBe('market.tick');
    });

    it('should skip clients not in OPEN state', () => {
      const connectingClient = makeClient(WS_CONNECTING);
      const closingClient = makeClient(WS_CLOSING);
      const closedClient = makeClient(WS_CLOSED);

      [connectingClient, closingClient, closedClient].forEach((c) => {
        gateway.handleConnection(c, makeRequest('/'));
        gateway.handleSubscribe({ symbols: ['AAPL'] }, c);
      });

      const mockServer = { clients: new Set([connectingClient, closingClient, closedClient]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      jest.clearAllMocks();
      gateway.broadcast(makeTick('AAPL'));

      expect(connectingClient.send).not.toHaveBeenCalled();
      expect(closingClient.send).not.toHaveBeenCalled();
      expect(closedClient.send).not.toHaveBeenCalled();
    });
  });

  // ---- Backpressure ---------------------------------------------------------

  describe('when a client write buffer exceeds the high-water mark', () => {
    it('should drop the message and increment droppedMessages', () => {
      const slowClient = makeClient();
      gateway.handleConnection(slowClient, makeRequest('/'));
      gateway.handleSubscribe({ symbols: ['AAPL'] }, slowClient);

      (slowClient as unknown as { _socket: { writableLength: number } })._socket = {
        writableLength: 65_537,
      };

      const mockServer = { clients: new Set([slowClient]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      jest.clearAllMocks();
      gateway.broadcast(makeTick('AAPL'));

      expect(slowClient.send).not.toHaveBeenCalled();
      expect(gateway.getMetrics().droppedMessages).toBe(1);
    });
  });

  describe('when a send callback returns an error', () => {
    it('should terminate the client', () => {
      const faultyClient = makeClient();
      gateway.handleConnection(faultyClient, makeRequest('/'));
      gateway.handleSubscribe({ symbols: ['AAPL'] }, faultyClient);

      faultyClient.send = jest.fn().mockImplementation((_data: unknown, cb: (err?: Error) => void) => {
        cb(new Error('write EPIPE'));
      });

      const mockServer = { clients: new Set([faultyClient]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      gateway.broadcast(makeTick('AAPL'));
      expect(faultyClient.terminate).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Metrics --------------------------------------------------------------

  describe('getMetrics', () => {
    it('should return zeroed counters on fresh instance', () => {
      expect(gateway.getMetrics()).toEqual({
        activeConnections: 0,
        messagesSent: 0,
        droppedMessages: 0,
      });
    });

    it('should increment messagesSent on successful send', () => {
      const client = makeClient();
      gateway.handleConnection(client, makeRequest('/'));
      gateway.handleSubscribe({ symbols: ['AAPL'] }, client);

      const mockServer = { clients: new Set([client]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      client.send = jest.fn().mockImplementation((_data: unknown, cb: (err?: Error) => void) => cb());
      gateway.broadcast(makeTick('AAPL'));

      expect(gateway.getMetrics().messagesSent).toBe(1);
    });
  });
});
