import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'ws';

const WS_OPEN = 1; // WebSocket.OPEN — using literal to avoid CJS default-import issues
import type { MarketTickEvent } from '@pulsedesk/contracts';
import type { IMarketTickBroadcaster } from '../../domain/ports/market-tick-broadcaster.port';

@WebSocketGateway({ path: '/stream' })
export class MarketStreamGateway
  implements IMarketTickBroadcaster, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MarketStreamGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  private connectedClients = 0;

  handleConnection(): void {
    this.connectedClients++;
    this.logger.log({ connectedClients: this.connectedClients }, 'WebSocket client connected');
  }

  handleDisconnect(): void {
    this.connectedClients--;
    this.logger.log({ connectedClients: this.connectedClients }, 'WebSocket client disconnected');
  }

  broadcast(event: MarketTickEvent): void {
    const payload = JSON.stringify(event);
    this.server.clients.forEach((client) => {
      if (client.readyState === WS_OPEN) {
        client.send(payload);
      }
    });
  }
}
