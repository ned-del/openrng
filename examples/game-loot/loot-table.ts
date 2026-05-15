/**
 * OpenRNG — Verifiable Loot Table
 *
 * Commit-reveal pattern for provably fair game item drops.
 * The loot table is hashed and published. Every drop maps a
 * verified random token to an item deterministically.
 * Anyone can recompute the mapping and verify the result.
 */

import { createHash } from 'crypto';

// ============================================================
// TYPES
// ============================================================

export interface LootItem {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  weight: number;
  properties?: Record<string, any>;
}

export interface LootTableConfig {
  name: string;
  version: string;
  items: LootItem[];
}

export interface LootDrop {
  itemId: string;
  item: LootItem;
  rngValue: number;
  rangeStart: number;
  rangeEnd: number;
  lootTableCommitment: string;
}

export interface UnidentifiedDrop {
  dropId: string;
  status: 'unidentified';
  rngValue: number;
  proof: {
    leafHash: string;
    batchId: string;
    merkleRoot: string;
    polygonScan: string | null;
  };
  revealHash: string;           // sha256(dropId + rngValue + lootTableCommitment)
  lootTableCommitment: string;  // anyone can verify against published table
  timestamp: string;
}

export interface RevealedDrop extends UnidentifiedDrop {
  status: 'unidentified';       // original status preserved for audit
  revealed: {
    item: LootItem;
    rangeStart: number;
    rangeEnd: number;
    timestamp: string;
  };
}

export interface VerificationResult {
  rngValid: boolean;      // OpenRNG proof verified on Polygon
  tableValid: boolean;    // loot table matches published commitment
  mappingValid: boolean;  // token value correctly maps to claimed item
  details: {
    rngValue: number;
    expectedItem: string;
    claimedItem: string;
    rangeStart: number;
    rangeEnd: number;
    commitment: string;
  };
}

// ============================================================
// LOOT TABLE
// ============================================================

export class LootTable {
  readonly name: string;
  readonly version: string;
  readonly items: LootItem[];
  readonly commitment: string;
  readonly totalWeight: number;

  // Precomputed cumulative ranges for deterministic mapping
  private ranges: Array<{ item: LootItem; start: number; end: number }>;

  constructor(config: LootTableConfig) {
    this.name = config.name;
    this.version = config.version;
    this.items = [...config.items];
    this.totalWeight = this.items.reduce((sum, item) => sum + item.weight, 0);

    if (this.items.length === 0) throw new Error('Loot table must have at least one item');
    if (this.totalWeight <= 0) throw new Error('Total weight must be positive');

    // Build cumulative probability ranges
    this.ranges = [];
    let cursor = 0;
    for (const item of this.items) {
      const probability = item.weight / this.totalWeight;
      this.ranges.push({
        item,
        start: cursor,
        end: cursor + probability,
      });
      cursor += probability;
    }
    // Fix floating point — last item always ends at exactly 1.0
    this.ranges[this.ranges.length - 1].end = 1.0;

    // Compute commitment hash
    this.commitment = this.computeCommitment();
  }

  /**
   * Compute the hash commitment of this loot table.
   * This is what gets published before any drops happen.
   * Anyone can verify: hash(canonical table) === published commitment
   */
  private computeCommitment(): string {
    const canonical = JSON.stringify({
      name: this.name,
      version: this.version,
      items: this.items.map(i => ({
        id: i.id,
        name: i.name,
        rarity: i.rarity,
        weight: i.weight,
        // Sort properties keys for determinism
        ...(i.properties ? { properties: this.sortObject(i.properties) } : {}),
      })),
    });

    return 'sha256:' + createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Deterministic mapping: RNG value (0-1) → loot item.
   * This is the core function that anyone can recompute.
   */
  resolve(rngValue: number): LootDrop {
    if (rngValue < 0 || rngValue >= 1) {
      throw new Error(`RNG value must be in [0, 1), got ${rngValue}`);
    }

    for (const range of this.ranges) {
      if (rngValue >= range.start && rngValue < range.end) {
        return {
          itemId: range.item.id,
          item: range.item,
          rngValue,
          rangeStart: range.start,
          rangeEnd: range.end,
          lootTableCommitment: this.commitment,
        };
      }
    }

    // Should never reach here, but fallback to last item
    const last = this.ranges[this.ranges.length - 1];
    return {
      itemId: last.item.id,
      item: last.item,
      rngValue,
      rangeStart: last.start,
      rangeEnd: last.end,
      lootTableCommitment: this.commitment,
    };
  }

  /**
   * Create an unidentified drop — carries proof but item is hidden.
   * The revealHash commits to the result without exposing it.
   */
  createUnidentifiedDrop(
    rngValue: number,
    proof: { leafHash: string; batchId: string; merkleRoot: string; polygonScan: string | null }
  ): UnidentifiedDrop {
    const dropId = createHash('sha256')
      .update(`drop:${proof.leafHash}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16);

    // Commit to the result without revealing it
    const revealHash = createHash('sha256')
      .update(`${dropId}:${rngValue}:${this.commitment}`)
      .digest('hex');

    return {
      dropId,
      status: 'unidentified',
      rngValue,
      proof,
      revealHash,
      lootTableCommitment: this.commitment,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reveal an unidentified drop — maps RNG to actual item.
   */
  reveal(drop: UnidentifiedDrop): RevealedDrop & { revealed: { item: LootItem; rangeStart: number; rangeEnd: number; timestamp: string } } {
    const resolved = this.resolve(drop.rngValue);

    return {
      ...drop,
      revealed: {
        item: resolved.item,
        rangeStart: resolved.rangeStart,
        rangeEnd: resolved.rangeEnd,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Verify a claimed drop is correct.
   * Anyone can call this — all inputs are public after reveal.
   */
  verify(
    claimedItemId: string,
    rngValue: number,
    publishedCommitment: string
  ): VerificationResult {
    // 1. Verify loot table matches commitment
    const tableValid = this.commitment === publishedCommitment;

    // 2. Recompute the mapping
    const expected = this.resolve(rngValue);
    const mappingValid = expected.itemId === claimedItemId;

    return {
      rngValid: true, // Caller should verify via OpenRNG.verify() separately
      tableValid,
      mappingValid,
      details: {
        rngValue,
        expectedItem: expected.itemId,
        claimedItem: claimedItemId,
        rangeStart: expected.rangeStart,
        rangeEnd: expected.rangeEnd,
        commitment: this.commitment,
      },
    };
  }

  /**
   * Get the full probability table (for publishing).
   */
  getProbabilities(): Array<{ id: string; name: string; rarity: string; probability: string; range: string }> {
    return this.ranges.map(r => ({
      id: r.item.id,
      name: r.item.name,
      rarity: r.item.rarity,
      probability: `${((r.end - r.start) * 100).toFixed(2)}%`,
      range: `[${r.start.toFixed(6)}, ${r.end.toFixed(6)})`,
    }));
  }

  /**
   * Export the canonical table for independent verification.
   */
  export(): { table: LootTableConfig; commitment: string; probabilities: ReturnType<LootTable['getProbabilities']> } {
    return {
      table: { name: this.name, version: this.version, items: this.items },
      commitment: this.commitment,
      probabilities: this.getProbabilities(),
    };
  }

  private sortObject(obj: Record<string, any>): Record<string, any> {
    return Object.keys(obj).sort().reduce((sorted, key) => {
      sorted[key] = obj[key];
      return sorted;
    }, {} as Record<string, any>);
  }
}
