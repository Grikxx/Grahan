/**
 * @grahan/engine — Perft (Performance Test) for Move Generation Verification
 *
 * Counts the number of leaf nodes at a given depth in the game tree.
 * Used to verify that the move generator and state transitions are correct.
 */

import type { GameState } from './types.js';
import { GameResult } from './types.js';
import { legalMoves } from './moves.js';
import { applyMove, checkGameResult } from './state.js';

/**
 * Counts leaf nodes at the given depth.
 *
 * At depth 0, returns 1 (the current node is a leaf).
 * At depth N, returns the sum of perft(N-1) for each legal move.
 *
 * Terminal nodes (wins/draws) are counted as leaves at depth 0 only;
 * at higher depths, they contribute 0 (no further moves to explore).
 */
export function perft(state: GameState, depth: number): number {
  if (depth === 0) return 1;

  const result = checkGameResult(state);
  if (result !== GameResult.Ongoing) return 0;

  const moves = legalMoves(state);
  let count = 0;

  for (const move of moves) {
    const newState = applyMove(state, move);
    count += perft(newState, depth - 1);
  }

  return count;
}

/**
 * Divide: shows perft(depth-1) for each legal move at the root.
 * Useful for debugging move generation — identifies which moves
 * produce incorrect subtree counts.
 */
export function divide(state: GameState, depth: number): Map<string, number> {
  const moves = legalMoves(state);
  const results = new Map<string, number>();

  for (const move of moves) {
    const key = `${move.from}->${move.to}`;
    const newState = applyMove(state, move);
    results.set(key, perft(newState, depth - 1));
  }

  return results;
}
