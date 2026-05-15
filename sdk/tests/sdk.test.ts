/**
 * OpenRNG SDK Tests — uses a mock HTTP server
 */

import http from 'http';
import { OpenRNG, OpenRNGError, AuthenticationError } from '../src';

// ============================================================
// MOCK SERVER
// ============================================================

let mockServer: http.Server;
let mockPort: number;

function createMockToken(index: number, value: number) {
  const leafHash = 'a'.repeat(56) + String(index).padStart(8, '0');
  return {
    value,
    leaf_hash: leafHash,
    node_id: `node-${index}`,
    batch_id: 'batch-mock-001',
    merkle_proof: {
      root: 'b'.repeat(64),
      proof_path: [{ hash: 'c'.repeat(64), position: 'right' }],
      leaf_index: index,
      anchor_tx: '0x' + 'd'.repeat(64),
      anchor_block: 12345,
      polygon_scan: 'https://amoy.polygonscan.com/tx/0x' + 'd'.repeat(64),
    },
  };
}

function startMockServer(): Promise<number> {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const parsed = body ? JSON.parse(body) : {};

        // Auth check
        if (req.url !== '/v1/tokens/verify' && req.headers['x-api-key'] !== 'test-key') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid API key' }));
          return;
        }

        if (req.url === '/v1/tokens/request' && req.method === 'POST') {
          const qty = parsed.quantity || 1;
          const min = parsed.range?.min ?? 0;
          const max = parsed.range?.max ?? 1000000;
          const tokens = Array.from({ length: qty }, (_, i) => {
            const rawVal = (i * 7919 + 42) % (max - min + 1) + min;
            return createMockToken(i, rawVal);
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            tokens,
            meta: {
              quantity_requested: qty,
              quantity_served: qty,
              latency_ms: 1,
              served_from_pool: true,
              timestamp: new Date().toISOString(),
            },
          }));
        } else if (req.url === '/v1/tokens/batch' && req.method === 'POST') {
          const qty = parsed.quantity || 1;
          const min = parsed.range?.min ?? 0;
          const max = parsed.range?.max ?? 1000000;
          const values = Array.from({ length: qty }, (_, i) =>
            (i * 7919 + 42) % (max - min + 1) + min
          );
          const proofs = values.map((_, i) => ({
            leaf_hash: 'a'.repeat(56) + String(i).padStart(8, '0'),
            batch_id: 'batch-mock-001',
            merkle_root: 'b'.repeat(64),
            anchor_tx: '0x' + 'd'.repeat(64),
            polygon_scan: 'https://amoy.polygonscan.com/tx/0x' + 'd'.repeat(64),
          }));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            values,
            proofs,
            meta: { quantity_requested: qty, quantity_served: qty, latency_ms: 1, timestamp: new Date().toISOString() },
          }));
        } else if (req.url === '/v1/tokens/verify' && req.method === 'POST') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            verified: true,
            leaf_hash: parsed.leaf_hash,
            batch_id: parsed.batch_id,
            batch: {
              merkle_root: 'b'.repeat(64),
              status: 'ready',
              anchor_tx_hash: '0x' + 'd'.repeat(64),
              polygon_scan: 'https://amoy.polygonscan.com/tx/0x' + 'd'.repeat(64),
            },
          }));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });
    });

    mockServer.listen(0, () => {
      const addr = mockServer.address() as any;
      resolve(addr.port);
    });
  });
}

// ============================================================
// TESTS
// ============================================================

beforeAll(async () => {
  mockPort = await startMockServer();
});

afterAll(() => {
  mockServer?.close();
});

function createSDK(overrides: Partial<Parameters<typeof OpenRNG['prototype']['number']>[0]> = {}) {
  return new OpenRNG({
    agentId: 'test-agent-001',
    endpoint: `http://localhost:${mockPort}`,
    apiKey: 'test-key',
    vertical: 'agent',
  });
}

describe('OpenRNG SDK', () => {

  test('number() returns value with proof', async () => {
    const rng = createSDK();
    const result = await rng.number({ min: 1, max: 100 });

    expect(result.value).toBeGreaterThanOrEqual(1);
    expect(result.value).toBeLessThanOrEqual(100);
    expect(result.proof).toBeDefined();
    expect(result.proof.leafHash).toHaveLength(64);
    expect(result.proof.batchId).toBe('batch-mock-001');
    expect(result.proof.polygonTx).toBeTruthy();
    expect(result.proof.polygonScan).toContain('polygonscan.com');
    rng.destroy();
  });

  test('number() defaults to 0-1000000 range', async () => {
    const rng = createSDK();
    const result = await rng.number();

    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(1000000);
    rng.destroy();
  });

  test('choose() selects from array with proof', async () => {
    const rng = createSDK();
    const result = await rng.choose(['buy', 'sell', 'hold']);

    expect(['buy', 'sell', 'hold']).toContain(result.choice);
    expect(result.index).toBeGreaterThanOrEqual(0);
    expect(result.index).toBeLessThan(3);
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.value).toBeLessThanOrEqual(1);
    expect(result.proof).toBeDefined();
    rng.destroy();
  });

  test('choose() with weights', async () => {
    const rng = createSDK();
    const result = await rng.choose(['a', 'b', 'c'], { weights: [0.8, 0.1, 0.1] });

    expect(['a', 'b', 'c']).toContain(result.choice);
    expect(result.proof).toBeDefined();
    rng.destroy();
  });

  test('shuffle() returns shuffled array with proofs', async () => {
    const rng = createSDK();
    const result = await rng.shuffle([1, 2, 3, 4, 5]);

    expect(result.result).toHaveLength(5);
    expect(result.result.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(result.proofs.length).toBe(4); // n-1 proofs
    rng.destroy();
  });

  test('shuffle() single element returns same', async () => {
    const rng = createSDK();
    const result = await rng.shuffle([42]);

    expect(result.result).toEqual([42]);
    expect(result.proofs).toHaveLength(0);
    rng.destroy();
  });

  test('dice() rolls correct number of dice', async () => {
    const rng = createSDK();
    const result = await rng.dice(2, 6);

    expect(result.rolls).toHaveLength(2);
    result.rolls.forEach(r => {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    });
    expect(result.total).toBe(result.rolls.reduce((a, b) => a + b, 0));
    expect(result.proofs).toHaveLength(2);
    rng.destroy();
  });

  test('flip() returns boolean with proof', async () => {
    const rng = createSDK();
    const result = await rng.flip();

    expect(typeof result.result).toBe('boolean');
    expect(result.proof).toBeDefined();
    rng.destroy();
  });

  test('batch() returns bulk values with proofs', async () => {
    const rng = createSDK();
    const result = await rng.batch(100, { min: 0, max: 1 });

    expect(result.values).toHaveLength(100);
    expect(result.proofs).toHaveLength(100);
    result.proofs.forEach(p => {
      expect(p.leafHash).toHaveLength(64);
      expect(p.batchId).toBe('batch-mock-001');
    });
    rng.destroy();
  });

  test('verify() validates a proof', async () => {
    const rng = createSDK();
    const result = await rng.number({ min: 1, max: 100 });

    const verification = await OpenRNG.verify(result.proof, `http://localhost:${mockPort}`);
    expect(verification.valid).toBe(true);
    expect(verification.batchId).toBe('batch-mock-001');
    expect(verification.polygonScan).toContain('polygonscan.com');
    rng.destroy();
  });

  test('authentication error on bad API key', async () => {
    const rng = new OpenRNG({
      agentId: 'test-agent',
      endpoint: `http://localhost:${mockPort}`,
      apiKey: 'wrong-key',
      maxRetries: 0,
    });

    await expect(rng.number()).rejects.toThrow(AuthenticationError);
    rng.destroy();
  });

  test('connection error on bad endpoint', async () => {
    const rng = new OpenRNG({
      agentId: 'test-agent',
      endpoint: 'http://localhost:1',
      apiKey: 'test-key',
      maxRetries: 0,
      timeoutMs: 1000,
    });

    await expect(rng.number()).rejects.toThrow();
    rng.destroy();
  });
});
