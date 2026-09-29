/**
 * @grahan/ai — Iterative Deepening Negamax with Alpha-Beta Pruning
 *
 * Searches the game tree to find the best move for the current player.
 * Uses iterative deepening to provide moves at any time budget.
 *
 * Features:
 * - Alpha-beta pruning for search tree reduction
 * - Transposition table for position caching
 * - Move ordering: TT best move first, then captures, then by mobility
 * - Iterative deepening for anytime behavior
 */

import {
  type GameState,
  type Move,
  GameResult,
  legalMoves,
  applyMove,
  checkGameResult,
} from '@grahan/engine';
import { evaluate, WIN_SCORE, LOSS_SCORE } from './evaluate.js';
import { TranspositionTable, TTFlag } from './transposition.js';

// ─── Search Result ───────────────────────────────────────────────────────────

export interface SearchResult {
  bestMove: Move | null;
  score: number;
  depth: number;
  nodesSearched: number;
}

// ─── Negamax Core ────────────────────────────────────────────────────────────

let nodesSearched = 0;

/**
 * Negamax with alpha-beta pruning and transposition table.
 *
 * Convention: returns score from the perspective of the side to move.
 * Positive = good for the mover.
 */
function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  tt: TranspositionTable,
): number {
  nodesSearched++;

  // Check terminal state
  const result = checkGameResult(state);
  if (result !== GameResult.Ongoing) {
    return evaluate(state);
  }

  // Leaf node: return heuristic evaluation
  if (depth === 0) {
    return evaluate(state);
  }

  // Probe transposition table
  const ttEntry = tt.probe(state.hash);
  let ttBestMove: Move | null = null;

  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === TTFlag.EXACT) return ttEntry.score;
    if (ttEntry.flag === TTFlag.LOWERBOUND) alpha = Math.max(alpha, ttEntry.score);
    if (ttEntry.flag === TTFlag.UPPERBOUND) beta = Math.min(beta, ttEntry.score);
    if (alpha >= beta) return ttEntry.score;
  }
  if (ttEntry) {
    ttBestMove = ttEntry.bestMove;
  }

  // Generate and order moves
  const moves = legalMoves(state);
  if (moves.length === 0) {
    return LOSS_SCORE + state.ply; // Prefer later losses (deeper = better for opponent)
  }

  // Move ordering: TT best move first
  if (ttBestMove) {
    const ttIdx = moves.findIndex(
      m => m.from === ttBestMove!.from && m.to === ttBestMove!.to,
    );
    if (ttIdx > 0) {
      const [best] = moves.splice(ttIdx, 1);
      moves.unshift(best);
    }
  }

  let bestScore = -Infinity;
  let bestMove: Move | null = null;
  let ttFlag = TTFlag.UPPERBOUND;

  for (const move of moves) {
    const newState = applyMove(state, move);
    const score = -negamax(newState, depth - 1, -beta, -alpha, tt);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }

    if (score > alpha) {
      alpha = score;
      ttFlag = TTFlag.EXACT;
    }

    if (alpha >= beta) {
      ttFlag = TTFlag.LOWERBOUND;
      break;
    }
  }

  // Store in transposition table
  tt.store(state.hash, depth, bestScore, ttFlag, bestMove);

  return bestScore;
}

// ─── Iterative Deepening Search ──────────────────────────────────────────────

/**
 * Performs iterative deepening search up to `maxDepth`.
 *
 * Returns the best move found at the deepest completed iteration.
 * Can be interrupted via `abortSignal` for time-limited search.
 */
export function search(
  state: GameState,
  maxDepth: number,
  abortSignal?: AbortSignal,
): SearchResult {
  const tt = new TranspositionTable(18); // 256K entries
  let bestResult: SearchResult = {
    bestMove: null,
    score: 0,
    depth: 0,
    nodesSearched: 0,
  };

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (abortSignal?.aborted) break;

    nodesSearched = 0;
    let alpha = -Infinity;
    let beta = Infinity;
    let bestScore = -Infinity;
    let bestMove: Move | null = null;

    const moves = legalMoves(state);

    // Use previous iteration's best move for ordering
    if (bestResult.bestMove) {
      const prevIdx = moves.findIndex(
        m => m.from === bestResult.bestMove!.from && m.to === bestResult.bestMove!.to,
      );
      if (prevIdx > 0) {
        const [best] = moves.splice(prevIdx, 1);
        moves.unshift(best);
      }
    }

    for (const move of moves) {
      if (abortSignal?.aborted) break;

      const newState = applyMove(state, move);
      const score = -negamax(newState, depth - 1, -beta, -alpha, tt);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, score);
    }

    if (!abortSignal?.aborted) {
      bestResult = {
        bestMove,
        score: bestScore,
        depth,
        nodesSearched,
      };
    }

    // Early exit if we found a forced win
    if (Math.abs(bestScore) >= WIN_SCORE - 100) break;
  }

  return bestResult;
}

/**
 * Quick search for a move at a given difficulty level.
 * Difficulty 1 = depth 1, difficulty 2 = depth 3, difficulty 3 = depth 5.
 */
export function findBestMove(state: GameState, difficulty: 1 | 2 | 3): SearchResult {
  const depthMap = { 1: 1, 2: 3, 3: 5 };
  return search(state, depthMap[difficulty]);
}
