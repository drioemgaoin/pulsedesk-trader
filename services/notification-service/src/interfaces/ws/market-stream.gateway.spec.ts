import { MarketStreamGateway } from './market-stream.gateway';
import type { MarketTickEvent } from '@pulsedesk/contracts';

// WebSocket readyState constants (RFC 6455 / ws library)
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

const makeTick = (): MarketTickEvent => ({
  eventType: 'market.tick',
  schemaVersion: 1,
  symbol: 'TSLA',
  bid: 200.0,
  ask: 200.5,
  last: 200.25,
  volume: 500,
  timestamp: new Date().toISOString(),
});

const makeClient = (readyState: number): { send: jest.Mock; readyState: number } => ({
  send: jest.fn(),
  readyState,
});

describe('Given a MarketStreamGateway instance', () => {
  let gateway: MarketStreamGateway;

  beforeEach(() => {
    gateway = new MarketStreamGateway();
  });

  describe('when a client connects', () => {
    it('should increment the connected client count', () => {
      const initialCount = (gateway as unknown as { connectedClients: number }).connectedClients;
      gateway.handleConnection();
      expect((gateway as unknown as { connectedClients: number }).connectedClients).toBe(
        initialCount + 1,
      );
    });
  });

  describe('when a client disconnects', () => {
    it('should decrement the connected client count', () => {
      gateway.handleConnection();
      gateway.handleConnection();
      gateway.handleDisconnect();
      expect((gateway as unknown as { connectedClients: number }).connectedClients).toBe(1);
    });
  });

  describe('when broadcast is called with a tick event', () => {
    it('should send the serialised event to all OPEN clients', () => {
      const openClient = makeClient(WS_OPEN);
      const closedClient = makeClient(WS_CLOSED);
      const mockServer = { clients: new Set([openClient, closedClient]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      gateway.broadcast(makeTick());

      expect(openClient.send).toHaveBeenCalledTimes(1);
      expect(closedClient.send).not.toHaveBeenCalled();
    });

    it('should serialise the event as JSON', () => {
      const client = makeClient(WS_OPEN);
      const mockServer = { clients: new Set([client]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      const tick = makeTick();
      gateway.broadcast(tick);

      const sent = JSON.parse((client.send as jest.Mock).mock.calls[0][0] as string) as MarketTickEvent;
      expect(sent.symbol).toBe('TSLA');
      expect(sent.eventType).toBe('market.tick');
    });

    it('should skip clients that are not in OPEN state', () => {
      const connectingClient = makeClient(WS_CONNECTING);
      const closingClient = makeClient(WS_CLOSING);
      const mockServer = { clients: new Set([connectingClient, closingClient]) };
      (gateway as unknown as { server: typeof mockServer }).server = mockServer;

      gateway.broadcast(makeTick());

      expect(connectingClient.send).not.toHaveBeenCalled();
      expect(closingClient.send).not.toHaveBeenCalled();
    });
  });
});
