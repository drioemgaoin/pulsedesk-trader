import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { verify } from 'jsonwebtoken';
import type { IncomingMessage } from 'http';

const WS_OPEN = 1; // WebSocket.OPEN — using literal to avoid CJS default-import issues

/** Bytes buffered in the underlying TCP socket before a message is dropped. */
const BACKPRESSURE_HIGH_WATER_MARK = 65_536; // 64 KiB

/** Maximum number of symbols a single client may subscribe to at once. */
const MAX_SYMBOLS_PER_CLIENT = 50;

/** Maximum allowed length for a single symbol string. */
const MAX_SYMBOL_LENGTH = 10;

import type { MarketTickEvent, OrderFilledEvent } from '@pulsedesk/contracts';
import type { IMarketTickBroadcaster } from '../../domain/ports/market-tick-broadcaster.port';

/** Internal socket shape for backpressure check (ws internals). */
interface WsInternals {
  _socket?: { writableLength?: number };
}

export interface StreamMetrics {
  activeConnections: number;
  messagesSent: number;
  droppedMessages: number;
}

@WebSocketGateway({ path: '/stream' })
export class MarketStreamGateway
  implements IMarketTickBroadcaster, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MarketStreamGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  /** Per-client symbol subscription set. Populated on connect, removed on disconnect. */
  private readonly subscriptions = new Map<WebSocket, Set<string>>();

  /** Per-client accountId decoded from JWT on connect. Null when JWT_SECRET is not set (dev mode). */
  private readonly accountIds = new Map<WebSocket, string | null>();

  private connectedClients = 0;
  private messagesSent = 0;
  private droppedMessages = 0;

  handleConnection(client: WebSocket, request: IncomingMessage): void {
    const secret = process.env['JWT_SECRET'];

    if (secret) {
      // Accept token from query param (?token=<JWT>) or Authorization header.
      // Query param is the standard browser-compatible mechanism for WS auth.
      const url = new URL(request.url ?? '', 'http://localhost');
      const token =
        url.searchParams.get('token') ??
        request.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        this.logger.warn('WS connection rejected — no token provided');
        client.close(4401, 'Unauthorized');
        return;
      }

      try {
        const decoded = verify(token, secret) as { sub?: string };
        this.accountIds.set(client, decoded.sub ?? null);
      } catch {
        this.logger.warn('WS connection rejected — invalid or expired token');
        client.close(4401, 'Unauthorized');
        return;
      }
    } else {
      this.logger.warn('JWT_SECRET not set — WS authentication bypassed (dev/test mode only)');
      this.accountIds.set(client, null);
    }

    this.subscriptions.set(client, new Set());
    this.connectedClients++;
    this.logger.log({ activeConnections: this.connectedClients }, 'client connected');
  }

  handleDisconnect(client: WebSocket): void {
    this.subscriptions.delete(client);
    this.accountIds.delete(client);
    this.connectedClients--;
    this.logger.log({ activeConnections: this.connectedClients }, 'client disconnected');
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: WebSocket,
  ): void {
    if (!isSubscribePayload(data)) {
      this.logger.warn('subscribe rejected — invalid payload shape');
      return;
    }

    const subs = this.subscriptions.get(client) ?? new Set<string>();
    data.symbols
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0 && s.length <= MAX_SYMBOL_LENGTH)
      .forEach((s) => subs.add(s));

    // Enforce per-client subscription cap
    if (subs.size > MAX_SYMBOLS_PER_CLIENT) {
      const capped = new Set([...subs].slice(0, MAX_SYMBOLS_PER_CLIENT));
      this.subscriptions.set(client, capped);
      client.send(JSON.stringify({ event: 'subscribed', data: { symbols: [...capped] } }));
      this.logger.warn({ cap: MAX_SYMBOLS_PER_CLIENT }, 'subscription cap enforced');
      return;
    }

    this.subscriptions.set(client, subs);
    client.send(JSON.stringify({ event: 'subscribed', data: { symbols: [...subs] } }));
    this.logger.debug({ symbols: [...subs] }, 'client subscribed');
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: unknown,
    @ConnectedSocket() client: WebSocket,
  ): void {
    if (!isSubscribePayload(data)) {
      this.logger.warn('unsubscribe rejected — invalid payload shape');
      return;
    }

    const subs = this.subscriptions.get(client) ?? new Set<string>();
    data.symbols
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .forEach((s) => subs.delete(s));

    this.subscriptions.set(client, subs);
    client.send(JSON.stringify({ event: 'subscribed', data: { symbols: [...subs] } }));
    this.logger.debug({ symbols: [...subs] }, 'client unsubscribed');
  }

  broadcast(event: MarketTickEvent): void {
    const symbol = event.symbol;
    const payload = JSON.stringify(event);

    this.server.clients.forEach((client) => {
      if (client.readyState !== WS_OPEN) return;

      const subs = this.subscriptions.get(client as WebSocket);
      if (!subs?.has(symbol)) return;

      // Backpressure: drop message if the underlying TCP write buffer exceeds the high-water mark.
      const writableLength = (client as unknown as WsInternals)._socket?.writableLength ?? 0;
      if (writableLength > BACKPRESSURE_HIGH_WATER_MARK) {
        this.droppedMessages++;
        this.logger.warn({ symbol, writableLength }, 'slow consumer — dropping message');
        return;
      }

      client.send(payload, (err) => {
        if (err) {
          this.logger.warn({ err }, 'send error — terminating client');
          client.terminate();
        } else {
          this.messagesSent++;
        }
      });
    });
  }

  broadcastFill(event: OrderFilledEvent): void {
    const payload = JSON.stringify({
      event: 'order.filled',
      data: {
        orderId: event.orderId,
        symbol: event.symbol,
        side: event.side,
        filledQuantity: event.filledQuantity,
        fillPrice: event.fillPrice,
        accountId: event.accountId,
      },
    });

    this.server.clients.forEach((client) => {
      if (client.readyState !== WS_OPEN) return;

      const clientAccountId = this.accountIds.get(client as WebSocket);
      // When JWT_SECRET is not set clientAccountId is null — broadcast to all (dev mode).
      // When set, only send to the owning account.
      if (clientAccountId !== null && clientAccountId !== event.accountId) return;

      const writableLength = (client as unknown as WsInternals)._socket?.writableLength ?? 0;
      if (writableLength > BACKPRESSURE_HIGH_WATER_MARK) {
        this.droppedMessages++;
        this.logger.warn({ accountId: event.accountId }, 'slow consumer — dropping fill message');
        return;
      }

      client.send(payload, (err) => {
        if (err) {
          this.logger.warn({ err }, 'fill send error — terminating client');
          (client as WebSocket).terminate();
        } else {
          this.messagesSent++;
        }
      });
    });
  }

  getMetrics(): StreamMetrics {
    return {
      activeConnections: this.connectedClients,
      messagesSent: this.messagesSent,
      droppedMessages: this.droppedMessages,
    };
  }
}

/** Runtime guard for subscribe/unsubscribe payload shape. */
function isSubscribePayload(data: unknown): data is { symbols: string[] } {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as Record<string, unknown>).symbols) &&
    ((data as { symbols: unknown[] }).symbols as unknown[]).every((s) => typeof s === 'string')
  );
}
