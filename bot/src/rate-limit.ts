/**
 * Simple per-user rate limiter
 *
 * Limits users to a configurable number of commands per window.
 * Uses a sliding window approach with periodic cleanup.
 */

const DEFAULT_MAX_REQUESTS = 10;
const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

interface UserBucket {
  timestamps: number[];
}

const buckets = new Map<number, UserBucket>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/** Start periodic cleanup of stale buckets */
export function startRateLimitCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [userId, bucket] of buckets) {
      bucket.timestamps = bucket.timestamps.filter(t => now - t < DEFAULT_WINDOW_MS);
      if (bucket.timestamps.length === 0) {
        buckets.delete(userId);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't block shutdown
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/** Stop cleanup timer */
export function stopRateLimitCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Check if a user is rate-limited.
 * Returns true if the request is ALLOWED, false if rate-limited.
 */
export function checkRateLimit(
  userId: number,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  const now = Date.now();

  let bucket = buckets.get(userId);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(userId, bucket);
  }

  // Remove expired timestamps
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    return false; // Rate limited
  }

  bucket.timestamps.push(now);
  return true; // Allowed
}

/** Get remaining requests for a user in the current window */
export function getRemainingRequests(
  userId: number,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
): number {
  const now = Date.now();
  const bucket = buckets.get(userId);
  if (!bucket) return maxRequests;

  const active = bucket.timestamps.filter(t => now - t < windowMs).length;
  return Math.max(0, maxRequests - active);
}
