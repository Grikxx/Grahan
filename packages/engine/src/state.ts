/**
 * @grahan/engine — Game State Management
 *
 * Pure, immutable state transitions. Every call to applyMove produces
 * a new GameState without mutating the original.
 */

import { type IncidenceStructure, gfPrime, buildAffinePlane } from '@grahan/math';
import {
  CellState,
  type Player,
  type Move,
  type GameState,
  type GameConfig,
  GameResult,
  GRAHAN_3_CONFIG,
  GRAHAN_5_CONFIG,
  opponent,
} from './types.js';
import { buildZobristTable, computeHash, type ZobristTable } from './zobrist.js';
import { resolveCustodialCapture } from './capture.js';
import { legalMoves } from './moves.js';

// ─── Zobrist table cache (one per board size) ────────────────────────────────

const zobristCache = new Map<number, ZobristTable>();

function getZobristTable(numPoints: number): ZobristTable {
  let table = zobristCache.get(numPoints);
  if (!table) {
    table = buildZobristTable(numPoints);
    zobristCache.set(numPoints, table);
  }
  return table;
}

// ─── Initial State Creation ──────────────────────────────────────────────────

/**
 * Creates the initial game state for the given configuration.
 *
 * Setup rules:
 * - Grahan-3 (q=3): Black on row y=0, White on row y=2, row y=1 empty
 * - Grahan-5 (q=5): Black on rows y=0,1, White on rows y=3,4, row y=2 empty
 */
export function createInitialState(config: GameConfig): GameState {
  const q = config.order;

  // Build the affine plane
  const field = gfPrime(q);
  const plane = buildAffinePlane(field);

  const board = new Uint8Array(plane.numPoints);

  // Place initial stones based on board size
  if (q === 3) {
    // Row y=0: Black
    for (let x = 0; x < q; x++) board[plane.pointIndex(x, 0)] = CellState.Black;
    // Row y=2: White
    for (let x = 0; x < q; x++) board[plane.pointIndex(x, 2)] = CellState.White;
  } else if (q === 5) {
    // Rows y=0,1: Black
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < q; x++) board[plane.pointIndex(x, y)] = CellState.Black;
    // Rows y=3,4: White
    for (let y = 3; y < 5; y++)
      for (let x = 0; x < q; x++) board[plane.pointIndex(x, y)] = CellState.White;
  } else {
    throw new Error(`Unsupported board order: ${q}. Only 3 and 5 are supported.`);
  }

  const table = getZobristTable(plane.numPoints);
  const hash = computeHash(board, CellState.Black, table);

  return {
    board,
    turn: CellState.Black,
    captured: [0, 0],
    ply: 0,
    hash,
    history: new Set([hash]),
    plane,
    captureTarget: config.captureTarget,
    maxPly: config.maxPly,
  };
}

// ─── Apply Move ──────────────────────────────────────────────────────────────

/**
 * Applies a move to the game state and returns a new state.
 *
 * Steps:
 * 1. Clone the board
 * 2. Move the stone from → to
 * 3. Resolve custodial captures at the landing point
 * 4. Update Zobrist hash incrementally
 * 5. Check superko — if the new hash is in history, the move is illegal
 * 6. Switch turns, increment ply
 */
export function applyMove(state: GameState, move: Move): GameState {
  const { board, turn, captured, ply, hash, history, plane, captureTarget, maxPly } = state;
  const table = getZobristTable(plane.numPoints);

  // 1. Clone board
  const newBoard = new Uint8Array(board);

  // 2. Move the stone
  newBoard[move.from] = CellState.Empty;
  newBoard[move.to] = turn;

  // 3. Resolve captures
  const captureResult = resolveCustodialCapture(newBoard, move.to, turn, plane);
  for (const capIdx of captureResult.captured) {
    newBoard[capIdx] = CellState.Empty;
  }

  // 4. Compute new hash incrementally
  let newHash = hash;
  // XOR out old turn
  if (turn === CellState.White) newHash ^= table.turnKey;
  // XOR out piece at old position, XOR in piece at new position
  newHash ^= table.pieceKeys[move.from][turn];
  newHash ^= table.pieceKeys[move.to][turn];
  // XOR out captured pieces
  const enemyColor = opponent(turn);
  for (const capIdx of captureResult.captured) {
    newHash ^= table.pieceKeys[capIdx][enemyColor];
  }
  // XOR in new turn
  if (enemyColor === CellState.White) newHash ^= table.turnKey;

  // 5. Superko check
  const newHistory = new Set(history);
  // Note: superko is checked by the caller if needed.
  // We still add to history for future checks.
  newHistory.add(newHash);

  // 6. Update captures
  const newCaptured: [number, number] = [...captured] as [number, number];
  if (turn === CellState.Black) {
    newCaptured[0] += captureResult.captured.length;
  } else {
    newCaptured[1] += captureResult.captured.length;
  }

  return {
    board: newBoard,
    turn: enemyColor,
    captured: newCaptured,
    ply: ply + 1,
    hash: newHash,
    history: newHistory,
    plane,
    captureTarget,
    maxPly,
  };
}

// ─── Game Result Check ───────────────────────────────────────────────────────

/**
 * Checks the game result for the current state.
 */
export function checkGameResult(state: GameState): GameResult {
  const { captured, captureTarget, ply, maxPly, turn, plane } = state;

  // Check capture threshold
  if (captured[0] >= captureTarget) return GameResult.BlackWins;
  if (captured[1] >= captureTarget) return GameResult.WhiteWins;

  // Check immobilization
  const moves = legalMoves(state);
  if (moves.length === 0) {
    // Player with no moves loses
    return turn === CellState.Black ? GameResult.WhiteWins : GameResult.BlackWins;
  }

  // Check turn cap (Grahan-3)
  if (maxPly > 0 && ply >= maxPly) {
    // Count remaining stones for tiebreaker
    let blackStones = 0;
    let whiteStones = 0;
    for (let i = 0; i < plane.numPoints; i++) {
      if (state.board[i] === CellState.Black) blackStones++;
      if (state.board[i] === CellState.White) whiteStones++;
    }
    if (blackStones > whiteStones) return GameResult.BlackWins;
    if (whiteStones > blackStones) return GameResult.WhiteWins;
    return GameResult.Draw;
  }

  return GameResult.Ongoing;
}

// ─── Superko validation ─────────────────────────────────────────────────────

/**
 * Checks if applying a move would violate superko.
 * Returns true if the resulting position has been seen before.
 */
export function wouldViolateSuperko(state: GameState, move: Move): boolean {
  const { board, turn, hash, history, plane } = state;
  const table = getZobristTable(plane.numPoints);

  // Simulate the hash change
  let newHash = hash;
  if (turn === CellState.White) newHash ^= table.turnKey;
  newHash ^= table.pieceKeys[move.from][turn];
  newHash ^= table.pieceKeys[move.to][turn];

  // We'd also need to account for captures, but for a quick check
  // we can do the full apply. For now, this is a simplified check.
  // The full check is done by checking history after applyMove.
  const newState = applyMove(state, move);
  return history.has(newState.hash);
}

// ─── Convenience Creators ────────────────────────────────────────────────────

export function createGrahan3(): GameState {
  return createInitialState(GRAHAN_3_CONFIG);
}

export function createGrahan5(): GameState {
  return createInitialState(GRAHAN_5_CONFIG);
}
