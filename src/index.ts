/**
 * OpenRNG Server — Entry Point
 *
 * Startup sequence:
 * 1. Load config from environment
 * 2. Connect to PostgreSQL (optional)
 * 3. Connect to Polygon (or mock in dev)
 * 4. Initialize pool manager with VDF workers + drand
 * 5. Register demo clients
 * 6. Start Express API
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { PoolManager } from './rng/pool-manager';
import { PolygonAnchor, MockPolygonAnchor } from './blockchain/anchor';
import { initDatabase } from './db/index';
import { createRouter } from './api/routes';
import { logger } from './utils/logger';
import { getLandingHTML } from './landing';

async function main() {
  logger.info('═══════════════════════════════════════');
  logger.info('  OpenRNG Core — Starting up');
  logger.info('═══════════════════════════════════════');

  // ── Database ──────────────────────────────────────────────
  const dbConnected = await initDatabase();
  if (dbConnected) {
    logger.info('Database: PostgreSQL ready');
  } else {
    logger.info('Database: running in-memory mode (no PostgreSQL)');
  }

  // ── Config ───────────────────────────────────────────────
  const PORT = parseInt(process.env.PORT || '3000');
  const IS_PROD = process.env.NODE_ENV === 'production';
  const USE_REAL_CHAIN = IS_PROD && !!process.env.DEPLOYER_PRIVATE_KEY &&
    process.env.DEPLOYER_PRIVATE_KEY !== '0xyour-private-key-here';

  // ── Blockchain ───────────────────────────────────────────
  let anchor: PolygonAnchor | MockPolygonAnchor;

  if (USE_REAL_CHAIN) {
    logger.info('Blockchain: connecting to Polygon Amoy testnet...');
    anchor = new PolygonAnchor({
      rpcUrl: process.env.POLYGON_RPC_URL!,
      privateKey: process.env.DEPLOYER_PRIVATE_KEY!,
      contractAddress: process.env.MERKLE_ANCHOR_CONTRACT!,
      chainId: parseInt(process.env.POLYGON_CHAIN_ID || '80002'),
    });
    const info = await (anchor as PolygonAnchor).getNetworkInfo();
    const balance = await (anchor as PolygonAnchor).getWalletBalance();
    logger.info(`Blockchain: ${info.name} block #${info.blockNumber} balance=${balance} MATIC`);
  } else {
    logger.info('Blockchain: using MOCK anchor (set DEPLOYER_PRIVATE_KEY for real chain)');
    anchor = new MockPolygonAnchor();
  }

  // ── Pool Manager ─────────────────────────────────────────
  const poolManager = new PoolManager({
    batchSize: parseInt(process.env.BATCH_SIZE || '65536'),
    vdfT: parseInt(process.env.VDF_T_SECONDS || '4'),
    vdfWorkers: parseInt(process.env.VDF_WORKERS || '3'),
    anchor,
    useDrand: true,  // Use drand beacon with local VDF fallback
    rateLimitPerMin: parseInt(process.env.RATE_LIMIT_PER_MIN || '100'),
  });

  // Log pool events
  poolManager.on('anchorComplete', (data) => {
    logger.info(`✓ Anchored: ${data.batchId} block #${data.blockNumber}`);
    logger.info(`  PolygonScan: ${data.polygonScanUrl}`);
  });

  poolManager.on('poolRefilled', (data) => {
    logger.info(`↑ Pool refilled: ${data.clientId} depth=${data.depth}`);
  });

  // ── Pre-warm shared pool ──────────────────────────────────
  logger.info('Pre-warming shared pool for agent/npc verticals...');
  await poolManager.preWarmSharedPool();
  const sharedStats = poolManager.getStats().sharedPool;
  logger.info(`Shared pool ready: ${sharedStats.depth} tokens, ${sharedStats.totalInjected} total injected`);

  // ── Register demo clients ─────────────────────────────────
  const demoClients = [
    { clientId: 'demo-casino-001', vertical: 'slot' as const },
    { clientId: 'demo-game-001',   vertical: 'game' as const },
    { clientId: 'demo-lottery-001',vertical: 'lottery' as const },
  ];

  for (const client of demoClients) {
    poolManager.registerClient(client);
  }

  // ── Express App ───────────────────────────────────────────
  const app = express();

  app.set('trust proxy', 1); // Railway runs behind a proxy
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Rate limiting — high limit for stress testing
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.EXPRESS_RATE_LIMIT || '100000'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded' },
  }));

  // Mount API
  app.use('/v1', createRouter(poolManager));

  // Root — HTML for browsers, JSON for API clients
  app.get('/', (req, res) => {
    const wantsHTML = req.accepts(['html', 'json']) === 'html';

    if (wantsHTML) {
      const dbLabel = dbConnected ? 'PostgreSQL' : 'In-memory';
      res.type('html').send(getLandingHTML(dbLabel));
    } else {
      res.json({
        name: 'OpenRNG API',
        version: '0.1.0',
        docs: '/v1/health',
        patent: 'Method and System for Gaming Random Number Generation',
        architecture: 'Hybrid drand/VDF + Merkle on Polygon',
        database: dbConnected ? 'PostgreSQL' : 'in-memory',
      });
    }
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  });

  // ── Start ─────────────────────────────────────────────────
  app.listen(PORT, () => {
    logger.info(`API running on http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/v1/health`);
    logger.info('');
    logger.info('Quick test commands:');
    logger.info(`  curl http://localhost:${PORT}/v1/health`);
    logger.info(`  curl -X POST http://localhost:${PORT}/v1/tokens/request \\`);
    logger.info(`    -H "x-api-key: ${process.env.API_SECRET || 'your-secret'}" \\`);
    logger.info(`    -H "Content-Type: application/json" \\`);
    logger.info(`    -d '{"client_id":"demo-casino-001","quantity":1,"vertical":"slot"}'`);
  });
}

main().catch(err => {
  logger.error(`Fatal startup error: ${err.message}`);
  process.exit(1);
});
