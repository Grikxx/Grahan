/**
 * @grahan/ai — Transposition Table
 *
 * Hash table mapping Zobrist keys to cached evaluation results.
 * Uses a fixed-size array with replacement (always-replace strategy).
 *
 * Each entry stores:
 * - key: full 64-bit Zobrist hash for verification
 * - depth: search depth at which this evaluation was computed
 * - score: the evaluation score
 * - flag: EXACT, LOWERBOUND, or UPPERBOUND
 * - bestMove: the best move found at this position (for move ordering)
 */

import type { Move } from '@grahan/engine';

export const enum TTFlag {
  EXACT = 0,
  LOWERBOUND = 1,
  UPPERBOUND = 2,
}

export interface TTEntry {
  key: bigint;
  depth: number;
  score: number;
  flag: TTFlag;
  bestMove: Move | null;
}

export class TranspositionTable {
  private readonly table: (TTEntry | null)[];
  private readonly size: number;
  private readonly mask: number;

  /**
   * Creates a transposition table with 2^sizeBits entries.
   * Default: 2^20 = ~1M entries ≈ 48MB
   */
  constructor(sizeBits = 20) {
    this.size = 1 << sizeBits;
    this.mask = this.size - 1;
    this.table = new Array(this.size).fill(null);
  }

  private index(key: bigint): number {
    // Use lower bits of the hash as index
    return Number(key & BigInt(this.mask));
  }

  /**
   * Probes the table for an entry matching the given key.
   * Returns null if no entry exists or the key doesn't match (collision).
   */
  probe(key: bigint): TTEntry | null {
    const entry = this.table[this.index(key)];
    if (entry && entry.key === key) return entry;
    return null;
  }

  /**
   * Stores an entry in the table. Uses always-replace strategy,
   * but prefers deeper searches over shallower ones.
   */
  store(key: bigint, depth: number, score: number, flag: TTFlag, bestMove: Move | null): void {
    const idx = this.index(key);
    const existing = this.table[idx];

    // Always replace if empty, or if the new search is at least as deep
    if (!existing || existing.key !== key || depth >= existing.depth) {
      this.table[idx] = { key, depth, score, flag, bestMove };
    }
  }

  /** Clears all entries */
  clear(): void {
    this.table.fill(null);
  }
}
