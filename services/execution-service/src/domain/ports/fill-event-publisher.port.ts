import type { Execution } from '../execution.entity';

export const FILL_EVENT_PUBLISHER = Symbol('IFillEventPublisher');

export interface IFillEventPublisher {
  publishFill(execution: Execution): Promise<void>;
}
