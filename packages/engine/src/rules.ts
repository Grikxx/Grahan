/**
 * GRAHAN-P ("Grahan with Pass") rules engine.
 *
 * Players: Rahu (the shadow, moves first) and Surya (the sun, moves second).
 *
 *  1. On your turn, slide one of your stones along any straight line or diagonal
 *     through it, any distance, to an empty point. Movement is bounded by the
 *     board edges (no wrapping). Stones cannot jump over other stones.
 *  2. After landing, look along every straight ray out of the landing point.
 *     A run of enemy stones closed off by one of your stones is captured
 *     ("Eclipse Sandwich"). Multiple directions can capture in the same move.
 *     No self-capture: a stone that lands between two enemy stones is NOT captured.
 *  3. Passing is legal: at any non-terminal position, the side to move may pass
 *     instead of moving. A pass changes only the side to move and advances ply by 1.
 *  4. Positional superko: a MOVE is illegal if it would recreate a position
 *     (board + side to move) that has already occurred in the game.
 *     Passes are exempt from superko and are always legal in non-terminal positions.
 *     Position history H is a multiset tracking position occurrences.
 *  5. Immediate win when capture target is reached.
 *     At ply limit L(n), the player with more stones wins (else draw).
 *     There is no stalemate loss in GRAHAN-P.
 */

import { buildPlane, type Plane } from "./geometry";

export const EMPTY = 0;
export const RAHU = 1;
export const SURYA = 2;

export type Cell = 0 | 1 | 2;
export type Player = 1 | 2;

export const other = (p: Player): Player => (p === RAHU ? SURYA : RAHU);
export const playerName = (p: Player) => (p === RAHU ? "Rahu" : "Surya");

// ─── Ruleset and Variants ───────────────────────────────────────────

export type Ruleset = "grahan-p" | "original";

export type VariantId = "grahan-4" | "grahan-6" | "grahan-7" | "grahan-8" | "grahan-9" | "grahan-10";

export interface Variant {
  readonly id: VariantId;
  readonly name: string;
  readonly q: number;
  readonly stones: number;
  readonly captureTarget: number;
  readonly maxPly: number;
  readonly maxTurns: number;
}

export const VARIANTS: Record<VariantId, Variant> = {
  "grahan-4": { id: "grahan-4", name: "4 × 4", q: 4, stones: 4, captureTarget: 3, maxPly: 100, maxTurns: 50 },
  "grahan-6": { id: "grahan-6", name: "6 × 6", q: 6, stones: 12, captureTarget: 5, maxPly: 200, maxTurns: 100 },
  "grahan-7": { id: "grahan-7", name: "7 × 7", q: 7, stones: 14, captureTarget: 6, maxPly: 250, maxTurns: 125 },
  "grahan-8": { id: "grahan-8", name: "8 × 8", q: 8, stones: 16, captureTarget: 7, maxPly: 300, maxTurns: 150 },
  "grahan-9": { id: "grahan-9", name: "9 × 9", q: 9, stones: 18, captureTarget: 8, maxPly: 350, maxTurns: 175 },
  "grahan-10": { id: "grahan-10", name: "10 × 10", q: 10, stones: 20, captureTarget: 9, maxPly: 400, maxTurns: 200 },
};

/** 1-based current turn number (each turn comprises one Rahu move and one Surya move). */
export function currentTurn(ply: number, maxTurns?: number): number {
  const turn = Math.floor(ply / 2) + 1;
  return maxTurns !== undefined ? Math.min(maxTurns, turn) : turn;
}

/** Number of full turns completed so far. */
export function completedTurns(ply: number): number {
  return Math.floor(ply / 2);
}

// ─── Moves, Actions, and State ──────────────────────────────────────

export interface Move {
  readonly from: number;
  readonly to: number;
  readonly lineId: number;
  readonly dir: 1 | -1;
  readonly steps: number;
}

export interface Pass {
  readonly type: "pass";
}

export const PASS: Pass = Object.freeze({ type: "pass" });

export type Action = Move | Pass;

export function isPass(action: unknown): action is Pass | "pass" {
  if (typeof action === "string") return action.toLowerCase() === "pass";
  if (typeof action === "object" && action !== null) {
    return (action as { type?: string }).type === "pass";
  }
  return false;
}

export interface Bracket {
  readonly lineId: number;
  /** The friendly stone that closes the sandwich. */
  readonly anchor: number;
  /** Enemy stones taken in this ray. */
  readonly cells: readonly number[];
}

export interface GameState {
  readonly variant: Variant;
  readonly plane: Plane;
  readonly board: Uint8Array;
  readonly turn: Player;
  /** captured[0]: Surya stones taken by Rahu. captured[1]: Rahu stones taken by Surya. */
  readonly captured: readonly [number, number];
  readonly ply: number;
  readonly key: number;
  /** Multiset of positions that have occurred in the game (position key -> count). */
  readonly seen: ReadonlyMap<number, number>;
  readonly lastMove: Move | Pass | null;
  readonly lastCaptured: readonly number[];
  readonly lastBrackets: readonly Bracket[];
  readonly ruleset: Ruleset;
}

// ─── Zobrist hashing ────────────────────────────────────────────────

export interface Zobrist {
  readonly lo: Int32Array; // [point * 3 + cell]
  readonly hi: Int32Array;
  readonly turnLo: number;
  readonly turnHi: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) | 0;
  };
}

const zobristCache = new Map<number, Zobrist>();

export function zobristFor(plane: Plane): Zobrist {
  let z = zobristCache.get(plane.q);
  if (!z) {
    const rnd = mulberry32(0x9e3779b9 ^ plane.q);
    const lo = new Int32Array(plane.numPoints * 3);
    const hi = new Int32Array(plane.numPoints * 3);
    for (let i = 0; i < lo.length; i++) {
      lo[i] = rnd();
      hi[i] = rnd();
    }
    z = { lo, hi, turnLo: rnd(), turnHi: rnd() };
    zobristCache.set(plane.q, z);
  }
  return z;
}

export const combineKey = (hi: number, lo: number) => (hi >>> 11) * 4294967296 + (lo >>> 0);

export function positionKey(board: Uint8Array, turn: Player, plane: Plane): number {
  const z = zobristFor(plane);
  let lo = 0;
  let hi = 0;
  for (let p = 0; p < board.length; p++) {
    const c = board[p];
    if (c !== EMPTY) {
      lo ^= z.lo[p * 3 + c];
      hi ^= z.hi[p * 3 + c];
    }
  }
  if (turn === SURYA) {
    lo ^= z.turnLo;
    hi ^= z.turnHi;
  }
  return combineKey(hi, lo);
}

// ─── Multiset Helper Functions ──────────────────────────────────────

function addHistory(seen: ReadonlyMap<number, number>, key: number): Map<number, number> {
  const next = new Map(seen);
  next.set(key, (next.get(key) ?? 0) + 1);
  return next;
}

export function decrementHistory(seen: ReadonlyMap<number, number>, key: number): Map<number, number> {
  const next = new Map(seen);
  const count = next.get(key) ?? 0;
  if (count <= 1) {
    next.delete(key);
  } else {
    next.set(key, count - 1);
  }
  return next;
}

// ─── Construction ───────────────────────────────────────────────────

export function makeState(
  variant: Variant,
  board: Uint8Array,
  turn: Player,
  captured: readonly [number, number] = [0, 0],
  ply = 0,
  ruleset: Ruleset = "grahan-p",
  history?: ReadonlyMap<number, number> | ReadonlySet<number> | readonly number[],
): GameState {
  const plane = buildPlane(variant.q);
  const key = positionKey(board, turn, plane);
  const seen = new Map<number, number>();
  if (history) {
    if (history instanceof Map) {
      for (const [k, v] of history) seen.set(k, v);
    } else if (history instanceof Set || Array.isArray(history)) {
      for (const k of history) seen.set(k, (seen.get(k) ?? 0) + 1);
    }
  }
  if (!seen.has(key)) {
    seen.set(key, 1);
  }
  return {
    variant,
    plane,
    board,
    turn,
    captured,
    ply,
    key,
    seen,
    lastMove: null,
    lastCaptured: [],
    lastBrackets: [],
    ruleset,
  };
}

/** Standard opening: 1 row per side for n=4, 2 rows per side for n >= 6. */
export function newGame(id: VariantId = "grahan-6", ruleset: Ruleset = "grahan-p"): GameState {
  const variant = VARIANTS[id];
  const q = variant.q;
  const board = new Uint8Array(q * q);
  const rows = q === 4 ? 1 : 2;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < q; x++) {
      board[y * q + x] = RAHU;
      board[(q - 1 - y) * q + x] = SURYA;
    }
  }
  return makeState(variant, board, RAHU, [0, 0], 0, ruleset);
}

/**
 * Builds a position from rows of text, top row first.
 * "R" = Rahu, "S" = Surya, "." = empty.
 */
export function positionFromRows(
  id: VariantId,
  rows: string[],
  turn: Player = RAHU,
  captured: readonly [number, number] = [0, 0],
  ply = 0,
  history?: ReadonlyMap<number, number> | ReadonlySet<number> | readonly number[],
  ruleset: Ruleset = "grahan-p",
): GameState {
  const variant = VARIANTS[id];
  const q = variant.q;
  if (rows.length !== q || rows.some((r) => r.length !== q)) {
    throw new Error(`Expected ${q} rows of ${q} characters`);
  }
  const board = new Uint8Array(q * q);
  rows.forEach((row, y) => {
    for (let x = 0; x < q; x++) {
      const ch = row[x];
      board[y * q + x] = ch === "R" ? RAHU : ch === "S" ? SURYA : EMPTY;
    }
  });
  return makeState(variant, board, turn, captured, ply, ruleset, history);
}

// ─── Move generation ────────────────────────────────────────────────

/** Points visited by a move, after `from`, ending at `to`. */
export function movePath(plane: Plane, move: Move): number[] {
  const [dx, dy] = plane.vec[move.lineId];
  const fx = plane.x(move.from);
  const fy = plane.y(move.from);
  const out: number[] = [];
  for (let s = 1; s <= move.steps; s++) {
    out.push(plane.point(fx + dx * move.dir * s, fy + dy * move.dir * s));
  }
  return out;
}

/** Movement does not wrap across board edges in this version. */
export function moveWraps(_plane: Plane, _move: Move): boolean {
  return false;
}

/**
 * All slides for one stone, strictly bounded by the grid edges (no wrapping).
 */
export function slidesFrom(board: Uint8Array, plane: Plane, from: number, out: Move[] = []): Move[] {
  const q = plane.q;
  const fx = plane.x(from);
  const fy = plane.y(from);

  for (const l of plane.linesThrough[from]) {
    const [dx, dy] = plane.vec[l];
    for (const dir of [1, -1] as const) {
      let cx = fx + dx * dir;
      let cy = fy + dy * dir;
      let steps = 1;
      while (cx >= 0 && cx < q && cy >= 0 && cy < q) {
        const to = plane.point(cx, cy);
        if (board[to] !== EMPTY) break;
        out.push({ from, to, lineId: l, dir, steps });
        cx += dx * dir;
        cy += dy * dir;
        steps++;
      }
    }
  }
  return out;
}

export function pseudoMoves(board: Uint8Array, plane: Plane, player: Player): Move[] {
  const out: Move[] = [];
  for (let p = 0; p < plane.numPoints; p++) {
    if (board[p] === player) slidesFrom(board, plane, p, out);
  }
  return out;
}

// ─── Capture ────────────────────────────────────────────────────────

/**
 * Finds the sandwiches made by `mover` standing on `landing`.
 * `board` must already show the stone on `landing` and its old point empty.
 * No self-capture: a stone that lands between two enemy stones is NOT captured.
 */
export function findCaptures(board: Uint8Array, plane: Plane, landing: number, mover: Player): Bracket[] {
  const enemy = other(mover);
  const out: Bracket[] = [];
  for (const ray of plane.captureRays[landing]) {
    const cells = ray.cells;
    let i = 0;
    while (i < cells.length && board[cells[i]] === enemy) i++;
    if (i > 0 && i < cells.length && board[cells[i]] === mover) {
      out.push({ lineId: ray.lineId, anchor: cells[i], cells: cells.slice(0, i) });
    }
  }
  return out;
}

// ─── Play / Apply ───────────────────────────────────────────────────

/** Applies a move without checking legality. */
export function applyMove(state: GameState, move: Move | Pass | "pass"): GameState {
  if (isPass(move)) return applyPass(state);

  const { plane, turn } = state;
  const board = new Uint8Array(state.board);
  board[move.from] = EMPTY;
  board[move.to] = turn;

  // Active captures: mover sandwiches enemy stones
  const brackets = findCaptures(board, plane, move.to, turn);
  const taken: number[] = [];
  for (const b of brackets) {
    for (const c of b.cells) {
      if (board[c] !== EMPTY) {
        board[c] = EMPTY;
        taken.push(c);
      }
    }
  }

  const next = other(turn);
  const captured: [number, number] = [state.captured[0], state.captured[1]];
  captured[turn === RAHU ? 0 : 1] += taken.length;

  const key = positionKey(board, next, plane);
  const seen = addHistory(state.seen, key);

  return {
    variant: state.variant,
    plane,
    board,
    turn: next,
    captured,
    ply: state.ply + 1,
    key,
    seen,
    lastMove: move,
    lastCaptured: taken,
    lastBrackets: brackets,
    ruleset: state.ruleset,
  };
}

/**
 * Applies a pass (N1).
 * Changes only side to move; moves nothing; captures nothing; advances ply by 1.
 * Exempt from superko, but records the resulting position in H (N2).
 */
export function applyPass(state: GameState): GameState {
  if (outcome(state).winner !== null) {
    throw new Error("Cannot pass in a terminal state");
  }
  const next = other(state.turn);
  const key = positionKey(state.board, next, state.plane);
  const seen = addHistory(state.seen, key);

  return {
    variant: state.variant,
    plane: state.plane,
    board: state.board,
    turn: next,
    captured: state.captured,
    ply: state.ply + 1,
    key,
    seen,
    lastMove: PASS,
    lastCaptured: [],
    lastBrackets: [],
    ruleset: state.ruleset,
  };
}

/** Applies an action (move or pass). */
export function applyAction(state: GameState, action: Action | "pass"): GameState {
  if (isPass(action)) return applyPass(state);
  return applyMove(state, action);
}

/** Key of the position a move would create (cheap superko test). */
function keyAfter(state: GameState, move: Move, scratch: Uint8Array): number {
  scratch.set(state.board);
  scratch[move.from] = EMPTY;
  scratch[move.to] = state.turn;
  for (const b of findCaptures(scratch, state.plane, move.to, state.turn)) {
    for (const c of b.cells) scratch[c] = EMPTY;
  }
  return positionKey(scratch, other(state.turn), state.plane);
}

export function isTerminal(state: GameState): boolean {
  const t = state.variant.captureTarget;
  if (state.captured[0] >= t || state.captured[1] >= t) return true;
  if (state.variant.maxPly > 0 && state.ply >= state.variant.maxPly) return true;
  return false;
}

/** Legal moves for the side to move, with superko applied (not counting pass). */
export function legalMoves(state: GameState): Move[] {
  if (isTerminal(state)) return [];
  const scratch = new Uint8Array(state.board.length);
  return pseudoMoves(state.board, state.plane, state.turn).filter((m) => {
    const k = keyAfter(state, m, scratch);
    return (state.seen.get(k) ?? 0) === 0;
  });
}

/** Legal moves of one stone (empty if it is not the side to move). */
export function legalMovesFrom(state: GameState, from: number): Move[] {
  if (isTerminal(state) || state.board[from] !== state.turn) return [];
  const scratch = new Uint8Array(state.board.length);
  return slidesFrom(state.board, state.plane, from).filter((m) => {
    const k = keyAfter(state, m, scratch);
    return (state.seen.get(k) ?? 0) === 0;
  });
}

/**
 * Returns all legal actions for the side to move.
 * In GRAHAN-P, at any non-terminal position, this includes all legal moves plus PASS.
 */
export function legalActions(state: GameState): Action[] {
  if (outcome(state).winner !== null) return [];
  const moves = legalMoves(state);
  if (state.ruleset === "original") {
    return moves;
  }
  return [...moves, PASS];
}

export function isLegal(state: GameState, action: Action | "pass"): boolean {
  if (outcome(state).winner !== null) return false;
  if (isPass(action)) {
    return state.ruleset !== "original";
  }
  return legalMovesFrom(state, action.from).some(
    (m) => m.to === action.to && m.lineId === action.lineId && m.dir === action.dir,
  );
}

/** Stones of `victim` that the other side could capture with its next move. */
export function threatenedStones(state: GameState, victim: Player): Set<number> {
  const attacker = other(victim);
  const out = new Set<number>();
  const board = new Uint8Array(state.board);
  for (const m of pseudoMoves(state.board, state.plane, attacker)) {
    board[m.from] = EMPTY;
    board[m.to] = attacker;
    for (const b of findCaptures(board, state.plane, m.to, attacker)) for (const c of b.cells) out.add(c);
    board[m.to] = EMPTY;
    board[m.from] = attacker;
  }
  return out;
}

// ─── Outcome ────────────────────────────────────────────────────────

export type Winner = "rahu" | "surya" | "draw" | null;
export type EndReason = "target" | "trapped" | "ply-cap" | null;

export interface Outcome {
  readonly winner: Winner;
  readonly reason: EndReason;
}

export function countStones(board: Uint8Array, player: Player): number {
  let n = 0;
  for (let i = 0; i < board.length; i++) if (board[i] === player) n++;
  return n;
}

export function outcome(state: GameState): Outcome {
  const t = state.variant.captureTarget;

  // (T1) Target check: player who just acted captured at least target in total
  if (state.captured[0] >= t) return { winner: "rahu", reason: "target" };
  if (state.captured[1] >= t) return { winner: "surya", reason: "target" };

  // For ruleset "original" only: stalemate loss
  if (state.ruleset === "original") {
    if (legalMoves(state).length === 0) {
      return { winner: state.turn === RAHU ? "surya" : "rahu", reason: "trapped" };
    }
  }

  // (T2) Ply limit L(n) check: compare stone counts
  if (state.variant.maxPly > 0 && state.ply >= state.variant.maxPly) {
    const r = countStones(state.board, RAHU);
    const s = countStones(state.board, SURYA);
    return { winner: r > s ? "rahu" : s > r ? "surya" : "draw", reason: "ply-cap" };
  }

  return { winner: null, reason: null };
}

// ─── Notation ───────────────────────────────────────────────────────

/** Columns a, b, c… from the left, rows 1, 2, 3… from the top. */
export function pointName(plane: Plane, p: number): string {
  return String.fromCharCode(97 + plane.x(p)) + (plane.y(p) + 1);
}

export function moveName(plane: Plane, move: Move | Pass | "pass" | null, captures = 0): string {
  if (!move || isPass(move)) return "pass";
  let s = `${pointName(plane, move.from)}–${pointName(plane, move.to)}`;
  if (captures > 0) s += ` ×${captures}`;
  return s;
}

// ─── Snapshots (for Web Worker and serialization) ───────────────────

export interface Snapshot {
  variant: VariantId;
  board: number[];
  turn: Player;
  captured: [number, number];
  ply: number;
  seen: number[];
  historyCounts?: [number, number][];
  ruleset?: Ruleset;
}

export function toSnapshot(s: GameState): Snapshot {
  return {
    variant: s.variant.id,
    board: Array.from(s.board),
    turn: s.turn,
    captured: [s.captured[0], s.captured[1]],
    ply: s.ply,
    seen: Array.from(s.seen.keys()),
    historyCounts: Array.from(s.seen.entries()),
    ruleset: s.ruleset,
  };
}

export function fromSnapshot(snap: Snapshot): GameState {
  const variant = VARIANTS[snap.variant];
  const plane = buildPlane(variant.q);
  const board = Uint8Array.from(snap.board);
  const seen = new Map<number, number>();
  if (snap.historyCounts && Array.isArray(snap.historyCounts)) {
    for (const [k, v] of snap.historyCounts) seen.set(k, v);
  } else if (snap.seen && Array.isArray(snap.seen)) {
    for (const k of snap.seen) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return {
    variant,
    plane,
    board,
    turn: snap.turn,
    captured: snap.captured,
    ply: snap.ply,
    key: positionKey(board, snap.turn, plane),
    seen,
    lastMove: null,
    lastCaptured: [],
    lastBrackets: [],
    ruleset: snap.ruleset ?? "grahan-p",
  };
}

// ─── Save / Load / Replay (Section 6) ───────────────────────────────

export interface GameRecord {
  version: number;
  variant: VariantId;
  ruleset?: Ruleset;
  actions: (Move | Pass | "pass" | string)[];
}

export function serializeGame(state: GameState, actions: readonly (Action | "pass")[] = []): string {
  const record: GameRecord = {
    version: 2,
    variant: state.variant.id,
    ruleset: state.ruleset,
    actions: actions.map((a) => (isPass(a) ? "pass" : a)),
  };
  return JSON.stringify(record, null, 2);
}

export function deserializeGame(json: string): { state: GameState; actions: Action[] } {
  const data = JSON.parse(json);
  // Backward compatibility: old format snapshot with board array
  if (data.board && data.variant) {
    const state = fromSnapshot(data);
    return { state, actions: [] };
  }
  const variant: VariantId = data.variant ?? "grahan-6";
  const ruleset: Ruleset = data.ruleset ?? "grahan-p";
  const rawActions: (Move | Pass | "pass" | string)[] = data.actions ?? [];
  const actions: Action[] = rawActions.map((a) => (isPass(a) ? PASS : (a as Move)));
  const state = replayGame(variant, actions, ruleset);
  return { state, actions };
}

export function replayGame(
  variantId: VariantId,
  actions: readonly (Action | "pass" | string)[],
  ruleset: Ruleset = "grahan-p",
): GameState {
  let state = newGame(variantId, ruleset);
  for (const a of actions) {
    if (outcome(state).winner !== null) break;
    state = applyAction(state, isPass(a) ? PASS : (a as Move));
  }
  return state;
}
