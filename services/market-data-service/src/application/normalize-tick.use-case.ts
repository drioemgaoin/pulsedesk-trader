import { Inject, Injectable, Logger } from '@nestjs/common';
import { Tick, TickValidationError } from '../domain/tick';
import { ITickMetrics, TICK_METRICS } from './ports/metrics.port';

@Injectable()
export class NormalizeTickUseCase {
  private readonly logger = new Logger(NormalizeTickUseCase.name);

  constructor(@Inject(TICK_METRICS) private readonly metrics: ITickMetrics) {}

  execute(raw: unknown): Tick | null {
    try {
      return Tick.create(raw);
    } catch (err) {
      if (err instanceof TickValidationError) {
        this.metrics.incrementRejected();
        this.logger.warn(`tick rejected: ${err.message}`);
        return null;
      }
      throw err;
    }
  }
}
