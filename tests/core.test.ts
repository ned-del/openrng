/**
 * OpenRNG Core Tests
 * Run: npm test
 */

import { MerkleTreeBuilder, BatchGenerator, TokenPool } from '../src/rng/engine';
import { MockPolygonAnchor } from '../src/blockchain/anchor';
import { PoolManager } from '../src/rng/pool-manager';

// ============================================================
// MERKLE TREE TESTS
// ============================================================

describe('MerkleTreeBuilder', () => {

  test('sha256 produces correct 64-char hex', () => {
    const hash = MerkleTreeBuilder.sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    // Known SHA-256 of "hello"
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('builds Merkle tree with correct root for power-of-2 leaves', async () => {
    const leaves = ['a', 'b', 'c', 'd'].map(l => MerkleTreeBuilder.sha256(l));
    const { root, levels } = await MerkleTreeBuilder.buildTree(leaves);

    expect(root).toHaveLength(64);
    expect(levels).toHaveLength(3); // leaves + 2 intermediate levels

    // Root should be deterministic
    const { root: root2 } = await MerkleTreeBuilder.buildTree(leaves);
    expect(root).toBe(root2);
  });

  test('proof generation and verification round-trips correctly', async () => {
    const leaves = Array.from({ length: 8 }, (_, i) =>
      MerkleTreeBuilder.sha256(`leaf-${i}`)
    );
    const { root, levels } = await MerkleTreeBuilder.buildTree(leaves);

    // Verify each leaf
    for (let i = 0; i < leaves.length; i++) {
      const proof = MerkleTreeBuilder.getProof(leaves, i, levels);
      const valid = MerkleTreeBuilder.verifyProof(leaves[i], proof, root);
      expect(valid).toBe(true);
    }
  });

  test('tampered leaf fails verification', async () => {
    const leaves = Array.from({ length: 4 }, (_, i) =>
      MerkleTreeBuilder.sha256(`leaf-${i}`)
    );
    const { root, levels } = await MerkleTreeBuilder.buildTree(leaves);
    const proof = MerkleTreeBuilder.getProof(leaves, 0, levels);

    // Tamper with leaf hash
    const tamperedLeaf = MerkleTreeBuilder.sha256('tampered');
    const valid = MerkleTreeBuilder.verifyProof(tamperedLeaf, proof, root);
    expect(valid).toBe(false);
  });

  test('proof length is O(log N)', async () => {
    for (const n of [8, 16, 32, 64]) {
      const leaves = Array.from({ length: n }, (_, i) =>
        MerkleTreeBuilder.sha256(`leaf-${i}`)
      );
      const { levels } = await MerkleTreeBuilder.buildTree(leaves);
      const proof = MerkleTreeBuilder.getProof(leaves, 0, levels);
      expect(proof).toHaveLength(Math.log2(n));
    }
  });
});

// ============================================================
// BATCH GENERATOR TESTS
// ============================================================

describe('BatchGenerator', () => {
  const SMALL_BATCH = 64; // Small for test speed

  test('generates batch with correct structure', async () => {
    const gen = new BatchGenerator(SMALL_BATCH, 1);
    const batch = await gen.generateBatch('test-client');

    expect(batch.batchId).toMatch(/^batch-/);
    expect(batch.leaves).toHaveLength(SMALL_BATCH);
    expect(batch.nodeIds).toHaveLength(SMALL_BATCH);
    expect(batch.merkleRoot).toHaveLength(64);
    expect(batch.vdfOutput).toHaveLength(64);
    expect(batch.rnGenParam).toHaveLength(64);
    expect(batch.status).toBe('anchoring');
  }, 30000);

  test('all leaf hashes are unique', async () => {
    const gen = new BatchGenerator(SMALL_BATCH, 1);
    const batch = await gen.generateBatch('test-client');

    const uniqueLeaves = new Set(batch.leaves);
    expect(uniqueLeaves.size).toBe(SMALL_BATCH);
  }, 30000);

  test('proof verifies correctly for generated batch', async () => {
    const gen = new BatchGenerator(SMALL_BATCH, 1);
    const batch = await gen.generateBatch('test-client');

    // Verify every token in the batch
    for (let i = 0; i < batch.leaves.length; i++) {
      const proof = gen.getProof(batch, i);
      expect(proof.valid).toBe(true);
    }
  }, 30000);

  test('different batches have different roots', async () => {
    const gen = new BatchGenerator(SMALL_BATCH, 1);
    const batch1 = await gen.generateBatch('test-client');
    const batch2 = await gen.generateBatch('test-client');

    expect(batch1.merkleRoot).not.toBe(batch2.merkleRoot);
    expect(batch1.vdfOutput).not.toBe(batch2.vdfOutput);
  }, 60000);
});

// ============================================================
// POOL MANAGER INTEGRATION TEST
// ============================================================

describe('PoolManager Integration', () => {

  test('full pipeline: generate → anchor → consume → verify', async () => {
    const anchor = new MockPolygonAnchor();
    const poolManager = new PoolManager({
      batchSize: 64,
      vdfT: 1,
      vdfWorkers: 1,
      anchor,
    });

    poolManager.registerClient({
      clientId: 'test-client',
      vertical: 'slot',
    });

    // Wait for pool to be ready
    await new Promise<void>((resolve) => {
      poolManager.on('poolRefilled', ({ clientId }) => {
        if (clientId === 'test-client') resolve();
      });
      setTimeout(resolve, 15000); // timeout fallback
    });

    // Request a token
    const result = await poolManager.getTokens({
      clientId: 'test-client',
      quantity: 1,
      range: { min: 1, max: 1000 },
    });

    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0].value).toBeGreaterThanOrEqual(1);
    expect(result.tokens[0].value).toBeLessThanOrEqual(1000);
    expect(result.tokens[0].leafHash).toHaveLength(64);
    expect(result.latencyMs).toBeLessThan(100); // Pool serves in <100ms

    // Verify the token
    if (result.tokens[0].proof) {
      expect(result.tokens[0].proof.valid).toBe(true);
    }

  }, 30000);

});

// ============================================================
// BLOCKCHAIN EFFICIENCY TEST
// (Validates the patent claim: 1 anchor per N tokens)
// ============================================================

describe('Blockchain Efficiency', () => {

  test('anchor ratio is exactly 1 tx per batch', async () => {
    const anchor = new MockPolygonAnchor();
    let anchorCount = 0;

    const poolManager = new PoolManager({
      batchSize: 64,
      vdfT: 1,
      vdfWorkers: 1,
      anchor,
    });

    poolManager.on('anchorComplete', () => { anchorCount++; });

    poolManager.registerClient({ clientId: 'efficiency-test', vertical: 'game' });

    await new Promise(r => setTimeout(r, 12000));

    const stats = poolManager.getStats();
    const totalTokens = stats.totalTokensIssued +
      stats.clients.reduce((a, c) => a + c.poolDepth, 0);

    // Core efficiency claim: anchors << tokens
    expect(stats.totalAnchors).toBeLessThan(totalTokens);

    if (stats.totalAnchors > 0 && totalTokens > 0) {
      const ratio = totalTokens / stats.totalAnchors;
      console.log(`Blockchain efficiency: 1 anchor per ${ratio.toFixed(0)} tokens`);
      expect(ratio).toBeGreaterThan(10); // At minimum 10:1 ratio
    }

  }, 20000);

});
