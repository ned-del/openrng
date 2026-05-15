/**
 * OpenRNG Database Migration
 * 
 * Creates the PostgreSQL schema for batches, tokens, and clients.
 * Run: npx ts-node scripts/migrate.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';

const MIGRATIONS = [
  // Clients table
  `CREATE TABLE IF NOT EXISTS clients (
    client_id   VARCHAR(64) PRIMARY KEY,
    name        VARCHAR(128) NOT NULL,
    vertical    VARCHAR(16) NOT NULL CHECK (vertical IN ('slot', 'game', 'lottery', 'agent', 'npc')),
    refill_threshold NUMERIC(3,2) DEFAULT 0.35,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,

  // Batches table
  `CREATE TABLE IF NOT EXISTS batches (
    batch_id            VARCHAR(64) PRIMARY KEY,
    merkle_root         VARCHAR(64) NOT NULL,
    vdf_output          VARCHAR(64) NOT NULL,
    rn_gen_param        VARCHAR(64) NOT NULL,
    block_param         VARCHAR(64) NOT NULL,
    anchor_tx_hash      VARCHAR(128),
    anchor_block_number BIGINT,
    batch_size          INTEGER NOT NULL,
    client_id           VARCHAR(64) REFERENCES clients(client_id),
    status              VARCHAR(16) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'anchoring', 'ready', 'depleted')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anchored_at         TIMESTAMPTZ
  );`,

  // Tokens table
  `CREATE TABLE IF NOT EXISTS tokens (
    leaf_hash     VARCHAR(64) PRIMARY KEY,
    node_id       VARCHAR(128) NOT NULL,
    node_index    INTEGER NOT NULL,
    batch_id      VARCHAR(64) NOT NULL REFERENCES batches(batch_id),
    value         DOUBLE PRECISION NOT NULL,
    consumed      BOOLEAN NOT NULL DEFAULT FALSE,
    consumed_at   TIMESTAMPTZ,
    consumed_by   VARCHAR(64)
  );`,

  // Indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_tokens_batch_id ON tokens(batch_id);`,
  `CREATE INDEX IF NOT EXISTS idx_tokens_consumed ON tokens(consumed) WHERE NOT consumed;`,
  `CREATE INDEX IF NOT EXISTS idx_batches_client_id ON batches(client_id);`,
  `CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);`,
];

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('OpenRNG Migration — connecting to database...');
    const client = await pool.connect();
    
    console.log('Running migrations...');
    for (const sql of MIGRATIONS) {
      const tableName = sql.match(/(?:TABLE|INDEX).*?(?:IF NOT EXISTS\s+)?(\w+)/i)?.[1] || 'unknown';
      await client.query(sql);
      console.log(`  ✓ ${tableName}`);
    }

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\nTables created:');
    result.rows.forEach(r => console.log(`  • ${r.table_name}`));

    client.release();
    console.log('\n✓ Migration complete!');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
