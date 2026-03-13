/**
 * Traffic profile delay generators.
 *
 * Each generator yields the delay (ms) to wait BEFORE firing the next order.
 * They are pure/synchronous — the hook feeds them to the run loop.
 */

export type TrafficProfile = 'Burst' | 'Steady' | 'Ramp';

export interface BurstConfig {
  profile: 'Burst';
  count: number; // 1–500
}

export interface SteadyConfig {
  profile: 'Steady';
  ratePerSecond: number; // 1–50
  durationSeconds: number; // 10–300
}

export interface RampConfig {
  profile: 'Ramp';
  minRatePerSecond: number; // 1–20
  maxRatePerSecond: number; // 5–50
  durationSeconds: number; // 30–300
}

export type ProfileConfig = BurstConfig | SteadyConfig | RampConfig;

/** Returns total expected order count for the run (null = no limit / not applicable). */
export function totalOrderCount(config: ProfileConfig): number | null {
  switch (config.profile) {
    case 'Burst':
      return config.count;
    case 'Steady':
      return Math.floor(config.ratePerSecond * config.durationSeconds);
    case 'Ramp':
      // Average rate × duration
      return Math.floor(
        ((config.minRatePerSecond + config.maxRatePerSecond) / 2) * config.durationSeconds,
      );
  }
}

/**
 * Generate an array of inter-order delays (ms) for a Burst profile.
 * All delays are 0 — fire as fast as concurrency allows.
 */
export function burstDelays(config: BurstConfig): number[] {
  return Array(config.count).fill(0);
}

/**
 * Generate inter-order delays (ms) for a Steady profile.
 * Spacing = 1000 / ratePerSecond ms between each order.
 */
export function steadyDelays(config: SteadyConfig): number[] {
  const count = Math.floor(config.ratePerSecond * config.durationSeconds);
  const gap = 1000 / config.ratePerSecond;
  return Array(count).fill(gap);
}

/**
 * Generate inter-order delays (ms) for a Ramp profile.
 * Rate increases linearly from minRate to maxRate over durationSeconds.
 * Delays are recalculated per-second bucket.
 */
export function rampDelays(config: RampConfig): number[] {
  const delays: number[] = [];
  const { minRatePerSecond, maxRatePerSecond, durationSeconds } = config;

  for (let sec = 0; sec < durationSeconds; sec++) {
    const t = durationSeconds <= 1 ? 1 : sec / (durationSeconds - 1);
    const rate = minRatePerSecond + t * (maxRatePerSecond - minRatePerSecond);
    const ordersThisSecond = Math.max(1, Math.round(rate));
    const gap = 1000 / ordersThisSecond;
    for (let i = 0; i < ordersThisSecond; i++) {
      delays.push(gap);
    }
  }

  return delays;
}

export function buildDelays(config: ProfileConfig): number[] {
  switch (config.profile) {
    case 'Burst':
      return burstDelays(config);
    case 'Steady':
      return steadyDelays(config);
    case 'Ramp':
      return rampDelays(config);
  }
}
