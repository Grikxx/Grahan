/**
 * @grahan/engine — Core Type Definitions
 */

import type { IncidenceStructure } from '@grahan/math';

// ─── Cell State ──────────────────────────────────────────────────────────────

export const enum CellState {
  Empty = 0,
  Black = 1,
  White = 2,
}

// ─── Player ──────────────────────────────────────────────────────────────────

export type Player = CellState.Black | CellState.White;

export function opponent(player: Player): Player {
  return player === CellState.Black ? CellState.White : CellState.Black;
}

// ─── Move ────────────────────────────────────────────────────────────────────

export interface Move {
  /** Source point index */
  from: number;
  /** Destination point index */
  to: number;
  /** Line ID used for this slide */
  lineId: number;
}

// ─── Capture Result ──────────────────────────────────────────────────────────

export interface CaptureResult {
  /** Indices of all captured stones */
  captured: number[];
  /** Number of captures per line (for animation) */
  capturesPerLine: Map<number, number[]>;
}

// ─── Game State ──────────────────────────────────────────────────────────────

export interface GameState {
  /** Board array: index -> CellState. Length = q² */
  readonly board: Uint8Array;
  /** Current player to move */
  readonly turn: Player;
  /** Cumulative captures: [blackCaptures, whiteCaptures] */
  readonly captured: readonly [number, number];
  /** Current ply (half-move) count */
  readonly ply: number;
  /** Zobrist hash of current position */
  readonly hash: bigint;
  /** Set of previously seen position hashes (for superko) */
  readonly history: Set<bigint>;
  /** Reference to the incidence structure */
  readonly plane: IncidenceStructure;
  /** Capture threshold for victory */
  readonly captureTarget: number;
  /** Maximum ply count (0 = no limit) */
  readonly maxPly: number;
}

// ─── Game Result ─────────────────────────────────────────────────────────────

export const enum GameResult {
  Ongoing = 0,
  BlackWins = 1,
  WhiteWins = 2,
  Draw = 3,
}

// ─── Game Config ─────────────────────────────────────────────────────────────

export interface GameConfig {
  /** Order of the affine plane (3, 4, or 5) */
  order: number;
  /** Number of captures needed to win */
  captureTarget: number;
  /** Maximum ply count (0 = unlimited) */
  maxPly: number;
}

/** Default configs for each game variant */
export const GRAHAN_3_CONFIG: GameConfig = {
  order: 3,
  captureTarget: 2,
  maxPly: 60,
};

export const GRAHAN_5_CONFIG: GameConfig = {
  order: 5,
  captureTarget: 4,
  maxPly: 0, // unlimited, superko prevents infinite loops
};
