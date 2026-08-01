/**
 * VEO storage interface + in-memory default
 */

import type { VEO } from '@openrng/core';

/** Interface for storing emitted VEOs */
export interface VEOStore {
  save(veo: VEO): Promise<void> | void;
  list(): Promise<VEO[]> | VEO[];
  get(objectId: string): Promise<VEO | undefined> | VEO | undefined;
}

/** In-memory VEO store (default — for dev/testing) */
export class MemoryStore implements VEOStore {
  private veos: Map<string, VEO> = new Map();
  private maxSize: number;
  private _evictions: number = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  save(veo: VEO): void {
    if (this.veos.size >= this.maxSize) {
      // FIFO eviction — oldest entry removed
      const firstKey = this.veos.keys().next().value;
      if (firstKey) {
        this.veos.delete(firstKey);
        this._evictions++;
      }
    }
    this.veos.set(veo.object_id, veo);
  }

  list(): VEO[] {
    return Array.from(this.veos.values());
  }

  get(objectId: string): VEO | undefined {
    return this.veos.get(objectId);
  }

  /** Number of VEOs evicted due to capacity limits */
  get evictions(): number {
    return this._evictions;
  }

  /** Current store size */
  get size(): number {
    return this.veos.size;
  }

  /** Clear all stored VEOs */
  clear(): void {
    this.veos.clear();
    this._evictions = 0;
  }
}
