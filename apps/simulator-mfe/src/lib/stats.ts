export interface SimulatorStats {
  submitted: number;
  accepted: number;
  filled: number;
  rejected: number;
  errored: number;
  fillLatencySum: number;    // ms
  fillLatencyCount: number;
  /** Map of "<httpStatus>|<reasonCode>" → count */
  errorBreakdown: Map<string, number>;
}

export function emptyStats(): SimulatorStats {
  return {
    submitted: 0,
    accepted: 0,
    filled: 0,
    rejected: 0,
    errored: 0,
    fillLatencySum: 0,
    fillLatencyCount: 0,
    errorBreakdown: new Map(),
  };
}

export interface StatUpdate {
  type: 'accepted' | 'filled' | 'rejected' | 'errored';
  latencyMs?: number;
  errorKey?: string; // "<httpStatus>|<reason>"
}

export function applyUpdate(stats: SimulatorStats, update: StatUpdate): SimulatorStats {
  const next = {
    ...stats,
    errorBreakdown: new Map(stats.errorBreakdown),
  };

  next.submitted++;

  switch (update.type) {
    case 'accepted':
      next.accepted++;
      break;
    case 'filled':
      next.accepted++;
      next.filled++;
      if (update.latencyMs !== undefined) {
        next.fillLatencySum += update.latencyMs;
        next.fillLatencyCount++;
      }
      break;
    case 'rejected':
      next.rejected++;
      if (update.errorKey) {
        next.errorBreakdown.set(update.errorKey, (next.errorBreakdown.get(update.errorKey) ?? 0) + 1);
      }
      break;
    case 'errored':
      next.errored++;
      if (update.errorKey) {
        next.errorBreakdown.set(update.errorKey, (next.errorBreakdown.get(update.errorKey) ?? 0) + 1);
      }
      break;
  }

  return next;
}

export function avgFillLatency(stats: SimulatorStats): number | null {
  if (stats.fillLatencyCount === 0) return null;
  return stats.fillLatencySum / stats.fillLatencyCount;
}

export function acceptanceRate(stats: SimulatorStats): number {
  if (stats.submitted === 0) return 0;
  return stats.accepted / stats.submitted;
}

export function fillRate(stats: SimulatorStats): number {
  if (stats.submitted === 0) return 0;
  return stats.filled / stats.submitted;
}

export function rejectionRate(stats: SimulatorStats): number {
  if (stats.submitted === 0) return 0;
  return stats.rejected / stats.submitted;
}
