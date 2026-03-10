export const TICK_METRICS = Symbol('ITickMetrics');

export interface ITickMetrics {
  incrementEmitted(): void;
  incrementRejected(): void;
  incrementPublishFailed(): void;
}
