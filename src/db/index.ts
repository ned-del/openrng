/**
 * OpenRNG — Database Connection Pool
 *
 * Optional PostgreSQL connection. Falls back gracefully to in-memory
 * when DATABASE_URL is not set or the connection fails.
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;
let isConnected = false;

/**
 * Initialize the database connection pool.
 * Returns true if connection succeeded, false otherwise.
 */
export async function initDatabase(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes('user:password')) {
    logger.info('Database: no DATABASE_URL configured, running in-memory only');
    return false;
  }

  // Retry connection up to 3 times (Railway internal DNS can be slow on cold start)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      pool = new Pool({
        connectionString: databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      isConnected = true;
      logger.info(`Database: PostgreSQL connected (attempt ${attempt})`);
      return true;
    } catch (err: any) {
      logger.warn(`Database: connection attempt ${attempt}/3 failed (${err.message})`);
      if (pool) { await pool.end().catch(() => {}); pool = null; }
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }

  logger.warn('Database: all connection attempts failed, running in-memory only');
  pool = null;
  isConnected = false;
  return false;
}

/**
 * Get the database pool. Returns null if not connected.
 */
export function getPool(): Pool | null {
  return isConnected ? pool : null;
}

/**
 * Check if database is available.
 */
export function isDatabaseConnected(): boolean {
  return isConnected;
}

/**
 * Shut down the database pool gracefully.
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
    logger.info('Database: connection pool closed');
  }
}
