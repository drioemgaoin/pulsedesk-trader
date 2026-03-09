import {
  BeforeApplicationShutdown,
  Injectable,
  Logger,
} from '@nestjs/common';

/**
 * Tracks service readiness and flips to NOT READY before drain begins.
 * This must happen before NestJS closes the HTTP server so the load balancer
 * stops routing new requests to this instance.
 */
@Injectable()
export class ReadinessService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(ReadinessService.name);
  private ready = true;

  isReady(): boolean {
    return this.ready;
  }

  setNotReady(): void {
    this.ready = false;
  }

  beforeApplicationShutdown(signal?: string): void {
    this.logger.log(
      `Shutdown signal received (${signal ?? 'unknown'}) — flipping readiness to NOT READY`,
    );
    this.setNotReady();
  }
}
