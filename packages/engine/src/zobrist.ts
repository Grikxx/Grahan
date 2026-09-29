/**
 * @grahan/engine — Zobrist Hashing
 *
 * 64-bit Zobrist hashing for position identification and superko detection.
 *
 * Uses BigInt for 64-bit values. A unique random 64-bit key is assigned to
 * each (pointIndex, cellState) pair, plus one key for side-to-move.
 *
 * Hash is computed incrementally: XOR in/out keys as pieces are placed/removed.
 */

import { CellState } from './types.js';

// ─── PRNG ────────────────────────────────────────────────────────────────────

/**
 * Simple xorshift128+ PRNG seeded deterministically for reproducible hashing.
 * Returns 64-bit BigInt values.
 */
function createPRNG(seed: bigint) {
  let s0 = seed;
  let s1 = seed ^ 0x6c62272e07bb0142n;

  return function next(): bigint {
    let x = s0;
    const y = s1;
    s0 = y;
    x ^= x << 23n;
    x ^= x >> 17n;
    x ^= y;
    x ^= y >> 26n;
    s1 = x;
    return (s0 + s1) & 0xffffffffffffffffn;
  };
}

// ─── Zobrist Table ───────────────────────────────────────────────────────────

export interface ZobristTable {
  /** pieceKeys[pointIndex][cellState] — XOR key for piece at position */
  readonly pieceKeys: readonly (readonly bigint[])[];
  /** Key XORed when it's White's turn (Black's turn = no XOR) */
  readonly turnKey: bigint;
}

/**
 * Builds a Zobrist table for a board of `numPoints` points.
 * Deterministic: same numPoints always produces the same table.
 */
export function buildZobristTable(numPoints: number): ZobristTable {
  const rng = createPRNG(0x47524148414e0042n); // "GRAHAN\0B" in ASCII hex

  const pieceKeys: bigint[][] = new Array(numPoints);
  for (let i = 0; i < numPoints; i++) {
    pieceKeys[i] = [
      0n,        // Empty = 0 (no contribution)
      rng(),     // Black = 1
      rng(),     // White = 2
    ];
    Object.freeze(pieceKeys[i]);
  }
  Object.freeze(pieceKeys);

  const turnKey = rng();

  return { pieceKeys, turnKey };
}

/**
 * Computes the full Zobrist hash for a board position from scratch.
 * Used for initialization; incremental updates are preferred during play.
 */
export function computeHash(
  board: Uint8Array,
  turn: number,
  table: ZobristTable,
): bigint {
  let hash = 0n;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== CellState.Empty) {
      hash ^= table.pieceKeys[i][board[i]];
    }
  }
  if (turn === CellState.White) {
    hash ^= table.turnKey;
  }
  return hash;
}
