/**
 * @grahan/engine — Legal Move Generation
 *
 * Enumerates all legal slides for the current player.
 *
 * A slide moves a stone from its current position to any reachable empty
 * point along any of the (q+1) lines through that position.
 *
 * Movement along a line is cyclic (toroidal), but a stone cannot jump
 * over any other stone (friend or foe). We walk in both directions
 * (+1 and -1 along the cyclic order) and collect reachable empty cells.
 *
 * Superko check: after computing what the resulting hash would be,
 * reject moves that recreate a previous (board, turn) state.
 */

import type { IncidenceStructure } from '@grahan/math';
import { CellState, type GameState, type Move, type Player } from './types.js';

/**
 * Generates all legal moves for the current player in the given state.
 *
 * If `skipSuperko` is true, superko validation is skipped (for performance
 * in AI search where it's checked at apply time).
 */
export function legalMoves(state: GameState, skipSuperko = false): Move[] {
  const { board, turn, plane } = state;
  const q = plane.order;
  const moves: Move[] = [];

  // Iterate all points with current player's stones
  for (let from = 0; from < plane.numPoints; from++) {
    if (board[from] !== turn) continue;

    // Check each line through this point
    const lines = plane.linesThrough(from);
    for (const lineId of lines) {
      const pts = plane.linePoints(lineId);
      const myIdx = pts.indexOf(from);

      // Walk both directions along the cyclic line
      for (const dir of [1, -1] as const) {
        for (let step = 1; step < q; step++) {
          const nextIdx = ((myIdx + dir * step) % q + q) % q;
          const to = pts[nextIdx];

          if (board[to] !== CellState.Empty) {
            // Blocked — can't jump over stones
            break;
          }

          // This cell is reachable
          moves.push({ from, to, lineId });
        }
      }
    }
  }

  // TODO: If superko checking is needed at generation time,
  // filter out moves that recreate a previous state.
  // For now, superko is validated in applyMove.

  return moves;
}

/**
 * Generates slides from a specific point (used by UI for highlighting).
 */
export function slidesFrom(
  state: GameState,
  from: number,
): Move[] {
  const { board, plane } = state;
  const q = plane.order;
  const moves: Move[] = [];

  const lines = plane.linesThrough(from);
  for (const lineId of lines) {
    const pts = plane.linePoints(lineId);
    const myIdx = pts.indexOf(from);

    for (const dir of [1, -1] as const) {
      for (let step = 1; step < q; step++) {
        const nextIdx = ((myIdx + dir * step) % q + q) % q;
        const to = pts[nextIdx];

        if (board[to] !== CellState.Empty) break;
        moves.push({ from, to, lineId });
      }
    }
  }

  return moves;
}
