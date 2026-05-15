/**
 * OpenRNG Feature Flags
 *
 * Centralized feature configuration reading from environment variables.
 * All flags have sensible defaults for development.
 */

export interface FeatureFlags {
  /** Use Redis for pool storage (future) */
  useRedis: boolean;
  /** Use worker queue for batch generation (future) */
  useWorkerQueue: boolean;
  /** Maximum shared pool depth (tokens) — 0 = unlimited */
  maxPoolDepth: number;
  /** Refill aggression factor (0 = lazy, 1 = aggressive pre-warming) */
  refillAggression: number;
  /** Fall back to on-demand generation when pool is exhausted */
  onDemandFallback: boolean;
  /** Include alerts array in health endpoint */
  healthAlerts: boolean;
}

function parseBool(val: string | undefined, defaultVal: boolean): boolean {
  if (val === undefined || val === '') return defaultVal;
  return val === 'true' || val === '1';
}

function parseNumber(val: string | undefined, defaultVal: number): number {
  if (val === undefined || val === '') return defaultVal;
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
}

export const features: FeatureFlags = {
  useRedis: parseBool(process.env.OPENRNG_USE_REDIS, false),
  useWorkerQueue: parseBool(process.env.OPENRNG_USE_WORKER_QUEUE, false),
  maxPoolDepth: parseNumber(process.env.OPENRNG_MAX_POOL_DEPTH, 0),
  refillAggression: parseNumber(process.env.OPENRNG_REFILL_AGGRESSION, 0.5),
  onDemandFallback: parseBool(process.env.OPENRNG_ON_DEMAND_FALLBACK, true),
  healthAlerts: parseBool(process.env.OPENRNG_HEALTH_ALERTS, true),
};
