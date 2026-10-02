/**
 * GRAHAN computer player.
 *
 * Iterative-deepening negamax with alpha-beta pruning, a transposition table,
 * capture-first move ordering (exact capture counts, killers, history),
 * a short capture-only quiescence search, and a wall-clock budget.
 *
 * Superko is respected inside the search.
 * Supports board sizes 6×6 through 10×10.
 */

import type { Plane } from "./geometry";
import {
  EMPTY, RAHU, SURYA, other, zobristFor, combineKey,
  type GameState, type Move, type Player, type Zobrist,
} from "./rules";

export type Level = 1 | 2 | 3;

export interface SearchOptions {
  /** Deepest iteration to try. */
  maxDepth: number;
  /** Time budget in milliseconds. */
  timeMs: number;
  /** Random spread (in eval points) added to root scores. 0 = best play. */
  noise: number;
  /** Quiescence search depth (default 4). Set to 0 to disable tactical reading. */
  qDepth?: number;
  /** Chance of playing a casual blunder / random move (0 to 1). */
  blunderRate?: number;
  /** Random source, for reproducible tests. */
  random?: () => number;
}

export const LEVELS: Record<Level, SearchOptions & { name: string; blurb: string }> = {
  1: {
    name: "Easy",
    blurb: "Casual play — makes mistakes, misses captures, and blunders",
    maxDepth: 1,
    qDepth: 0,
    timeMs: 120,
    noise: 450,
    blunderRate: 0.28,
  },
  2: {
    name: "Medium",
    blurb: "Balanced play — solid basics with occasional oversights",
    maxDepth: 3,
    qDepth: 2,
    timeMs: 400,
    noise: 35,
    blunderRate: 0.04,
  },
  3: {
    name: "Hard",
    blurb: "Master play — deep tactical reading and ruthless precision",
    maxDepth: 16,
    qDepth: 4,
    timeMs: 1500,
    noise: 0,
    blunderRate: 0,
  },
};

export const HINT_OPTIONS: SearchOptions & { name: string } = {
  name: "Hint",
  maxDepth: 10,
  qDepth: 4,
  timeMs: 800,
  noise: 0,
  blunderRate: 0,
};

export interface SearchResult {
  move: Move | null;
  score: number;
  depth: number;
  nodes: number;
}

const WIN = 1_000_000;
const MATE_ZONE = WIN - 10_000;
const INF = 2 * WIN;
const Q_DEPTH = 4;
const EXACT = 0, LOWER = 1, UPPER = 2;

interface TTEntry { depth: number; score: number; flag: number; move: number }

// Packed move (safe for up to 10×10 boards, n <= 100):
// from (7 bits) | to (7 bits)<<7 | line (8 bits)<<14 | dirBit (1 bit)<<22 | steps (5 bits)<<23
const pack = (from: number, to: number, line: number, dir: 1 | -1, steps: number) =>
  from | (to << 7) | (line << 14) | ((dir === 1 ? 1 : 0) << 22) | (steps << 23);
const mFrom = (m: number) => m & 0x7f;
const mTo = (m: number) => (m >> 7) & 0x7f;
const mLine = (m: number) => (m >> 14) & 0xff;
const mDir = (m: number): 1 | -1 => (((m >> 22) & 1) === 1 ? 1 : -1);
const mSteps = (m: number) => (m >> 23) & 0x1f;
const unpack = (m: number): Move => ({ from: mFrom(m), to: mTo(m), lineId: mLine(m), dir: mDir(m), steps: mSteps(m) });

class Abort extends Error {}

class Searcher {
  readonly plane: Plane;
  readonly q: number;
  readonly n: number;
  readonly target: number;
  readonly maxPly: number;
  readonly z: Zobrist;
  readonly board: Uint8Array;
  readonly caps = new Int32Array(3); // caps[player] = enemy stones taken by player
  turn: Player;
  ply: number;
  lo = 0;
  hi = 0;
  readonly seen: ReadonlySet<number>;
  readonly path = new Set<number>();
  readonly tt = new Map<number, TTEntry>();
  readonly killers = new Int32Array(256).fill(-1);
  readonly historyScore: Int32Array;
  readonly capStack = new Int16Array(4096);
  readonly qDepth: number;
  capTop = 0;
  nodes = 0;
  deadline = 0;

  constructor(state: GameState, qDepth = Q_DEPTH) {
    this.qDepth = qDepth;
    this.plane = state.plane;
    this.q = state.plane.q;
    this.n = state.plane.numPoints;
    this.target = state.variant.captureTarget;
    this.maxPly = state.variant.maxPly;
    this.z = zobristFor(state.plane);
    this.board = new Uint8Array(state.board);
    this.turn = state.turn;
    this.ply = state.ply;
    this.caps[RAHU] = state.captured[0];
    this.caps[SURYA] = state.captured[1];
    this.seen = state.seen;
    this.historyScore = new Int32Array(this.n * this.n);
    for (let p = 0; p < this.n; p++) {
      const c = this.board[p];
      if (c !== EMPTY) this.toggle(p, c);
    }
    if (this.turn === SURYA) { this.lo ^= this.z.turnLo; this.hi ^= this.z.turnHi; }
  }

  private toggle(p: number, c: number) {
    this.lo ^= this.z.lo[p * 3 + c];
    this.hi ^= this.z.hi[p * 3 + c];
  }

  key() { return combineKey(this.hi, this.lo); }

  /** Moves for side `player`, packed, appended to `out`. */
  gen(player: Player, out: number[]) {
    const { board, plane, q, n } = this;
    for (let from = 0; from < n; from++) {
      if (board[from] !== player) continue;
      const fx = plane.x(from);
      const fy = plane.y(from);
      for (const l of plane.linesThrough[from]) {
        const [dx, dy] = plane.vec[l];
        for (const dir of [1, -1] as const) {
          let cx = fx + dx * dir;
          let cy = fy + dy * dir;
          let s = 1;
          while (cx >= 0 && cx < q && cy >= 0 && cy < q) {
            const to = plane.point(cx, cy);
            if (board[to] !== EMPTY) break;
            out.push(pack(from, to, l, dir, s));
            cx += dx * dir;
            cy += dy * dir;
            s++;
          }
        }
      }
    }
  }

  /** Number of slides available to `player` (no superko), for mobility. */
  mobility(player: Player): number {
    const { board, plane, q, n } = this;
    let count = 0;
    for (let from = 0; from < n; from++) {
      if (board[from] !== player) continue;
      const fx = plane.x(from);
      const fy = plane.y(from);
      for (const l of plane.linesThrough[from]) {
        const [dx, dy] = plane.vec[l];
        for (const dir of [1, -1] as const) {
          let cx = fx + dx * dir;
          let cy = fy + dy * dir;
          while (cx >= 0 && cx < q && cy >= 0 && cy < q) {
            const to = plane.point(cx, cy);
            if (board[to] !== EMPTY) break;
            count++;
            cx += dx * dir;
            cy += dy * dir;
          }
        }
      }
    }
    return count;
  }

  /** Exact number of stones a move would capture, without changing the board. */
  captureCount(m: number): number {
    const from = mFrom(m), to = mTo(m);
    const me = this.turn, enemy = other(me);
    const board = this.board;
    let total = 0;
    for (const ray of this.plane.captureRays[to]) {
      const cells = ray.cells;
      let i = 0;
      while (i < cells.length && (cells[i] === from ? false : board[cells[i]] === enemy)) i++;
      if (i > 0 && i < cells.length && cells[i] !== from && board[cells[i]] === me) total += i;
    }

    // Check if mover's stone gets captured (suicide / interposition penalty)
    const tx = this.plane.x(to), ty = this.plane.y(to);
    const q = this.q;
    for (const l of this.plane.linesThrough[to]) {
      const [dx, dy] = this.plane.vec[l];
      let cx1 = tx + dx, cy1 = ty + dy;
      while (cx1 >= 0 && cx1 < q && cy1 >= 0 && cy1 < q) {
        const pt = this.plane.point(cx1, cy1);
        if (pt === from || board[pt] !== me) break;
        cx1 += dx; cy1 += dy;
      }
      if (cx1 < 0 || cx1 >= q || cy1 < 0 || cy1 >= q || board[this.plane.point(cx1, cy1)] !== enemy) continue;

      let cx2 = tx - dx, cy2 = ty - dy;
      while (cx2 >= 0 && cx2 < q && cy2 >= 0 && cy2 < q) {
        const pt = this.plane.point(cx2, cy2);
        if (pt === from || board[pt] !== me) break;
        cx2 -= dx; cy2 -= dy;
      }
      if (cx2 < 0 || cx2 >= q || cy2 < 0 || cy2 >= q || board[this.plane.point(cx2, cy2)] !== enemy) continue;

      total -= 10;
      break;
    }

    return total;
  }

  make(m: number): number {
    const from = mFrom(m), to = mTo(m);
    const me = this.turn, enemy = other(me);
    const board = this.board;
    board[from] = EMPTY; this.toggle(from, me);
    board[to] = me; this.toggle(to, me);

    // Active captures (enemy stones captured by me)
    let k = 0;
    for (const ray of this.plane.captureRays[to]) {
      const cells = ray.cells;
      let i = 0;
      while (i < cells.length && board[cells[i]] === enemy) i++;
      if (i > 0 && i < cells.length && board[cells[i]] === me) {
        for (let j = 0; j < i; j++) {
          const c = cells[j];
          if (board[c] !== EMPTY) {
            board[c] = EMPTY;
            this.toggle(c, enemy);
            this.capStack[this.capTop++] = c;
            k++;
          }
        }
      }
    }

    // Interposition captures: mover stone placed between two enemy stones
    let s = 0;
    const tx = this.plane.x(to), ty = this.plane.y(to);
    const q = this.q;
    for (const l of this.plane.linesThrough[to]) {
      const [dx, dy] = this.plane.vec[l];

      let cx1 = tx + dx, cy1 = ty + dy;
      while (cx1 >= 0 && cx1 < q && cy1 >= 0 && cy1 < q && board[this.plane.point(cx1, cy1)] === me) {
        cx1 += dx;
        cy1 += dy;
      }
      if (cx1 < 0 || cx1 >= q || cy1 < 0 || cy1 >= q || board[this.plane.point(cx1, cy1)] !== enemy) continue;

      let cx2 = tx - dx, cy2 = ty - dy;
      while (cx2 >= 0 && cx2 < q && cy2 >= 0 && cy2 < q && board[this.plane.point(cx2, cy2)] === me) {
        cx2 -= dx;
        cy2 -= dy;
      }
      if (cx2 < 0 || cx2 >= q || cy2 < 0 || cy2 >= q || board[this.plane.point(cx2, cy2)] !== enemy) continue;

      let rx = cx2 + dx, ry = cy2 + dy;
      while (rx !== cx1 || ry !== cy1) {
        const pt = this.plane.point(rx, ry);
        if (board[pt] === me) {
          board[pt] = EMPTY;
          this.toggle(pt, me);
          this.capStack[this.capTop++] = pt;
          s++;
        }
        rx += dx;
        ry += dy;
      }
    }

    this.capStack[this.capTop++] = k;
    this.capStack[this.capTop++] = s;
    this.caps[me] += k;
    this.caps[enemy] += s;
    this.turn = enemy;
    this.lo ^= this.z.turnLo; this.hi ^= this.z.turnHi;
    this.ply++;
    return k - s;
  }

  unmake(m: number) {
    const from = mFrom(m), to = mTo(m);
    this.ply--;
    this.lo ^= this.z.turnLo; this.hi ^= this.z.turnHi;
    const me = other(this.turn), enemy = this.turn;
    this.turn = me;

    const s = this.capStack[--this.capTop];
    const k = this.capStack[--this.capTop];
    this.caps[enemy] -= s;
    this.caps[me] -= k;

    // Restore mover stones captured by enemy
    for (let j = 0; j < s; j++) {
      const c = this.capStack[--this.capTop];
      this.board[c] = me;
      this.toggle(c, me);
    }
    // Restore enemy stones captured by me
    for (let j = 0; j < k; j++) {
      const c = this.capStack[--this.capTop];
      this.board[c] = enemy;
      this.toggle(c, enemy);
    }
    this.board[to] = EMPTY; this.toggle(to, me);
    this.board[from] = me; this.toggle(from, me);
  }

  /** Static evaluation from the side to move's point of view. */
  evaluate(): number {
    const me = this.turn, opp = other(me);
    const capDiff = this.caps[me] - this.caps[opp];
    let score = 1000 * capDiff;
    if (this.caps[me] === this.target - 1) score += 150;
    if (this.caps[opp] === this.target - 1) score -= 150;
    score += 6 * (this.mobility(me) - this.mobility(opp));
    return score;
  }

  private checkTime() {
    if ((++this.nodes & 511) === 0 && now() > this.deadline) throw new Abort();
  }

  private order(moves: number[], ttMove: number, height: number): void {
    const scores = new Map<number, number>();
    const k1 = this.killers[height * 2], k2 = this.killers[height * 2 + 1];
    for (const m of moves) {
      let s = this.captureCount(m) * 100000;
      if (m === ttMove) s += 10_000_000;
      else if (m === k1 || m === k2) s += 50_000;
      s += this.historyScore[mFrom(m) * this.n + mTo(m)];
      scores.set(m, s);
    }
    moves.sort((a, b) => scores.get(b)! - scores.get(a)!);
  }

  quiesce(alpha: number, beta: number, height: number, qd: number): number {
    this.checkTime();
    if (this.caps[other(this.turn)] >= this.target) return -(WIN - height);
    const stand = this.evaluate();
    if (qd === 0 || stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const moves: number[] = [];
    this.gen(this.turn, moves);
    const caps: number[] = [];
    for (const m of moves) if (this.captureCount(m) > 0) caps.push(m);
    if (caps.length === 0) return stand;
    caps.sort((a, b) => this.captureCount(b) - this.captureCount(a));
    for (const m of caps) {
      this.make(m);
      const key = this.key();
      if (this.seen.has(key) || this.path.has(key)) { this.unmake(m); continue; }
      this.path.add(key);
      let score: number;
      try {
        score = -this.quiesce(-beta, -alpha, height + 1, qd - 1);
      } finally {
        this.path.delete(key);
        this.unmake(m);
      }
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  private hasLegalMove(moves: number[]): boolean {
    for (const m of moves) {
      this.make(m);
      const key = this.key();
      this.unmake(m);
      if (!this.seen.has(key) && !this.path.has(key)) return true;
    }
    return false;
  }

  private plyCapScore(height: number): number {
    const me = this.turn, opp = other(me);
    const diff = this.caps[me] - this.caps[opp];
    return diff > 0 ? WIN - height : diff < 0 ? -(WIN - height) : 0;
  }

  negamax(depth: number, alpha: number, beta: number, height: number): number {
    this.checkTime();
    if (this.caps[other(this.turn)] >= this.target) return -(WIN - height);

    const moves: number[] = [];
    this.gen(this.turn, moves);

    if (this.maxPly > 0 && this.ply >= this.maxPly) {
      return this.hasLegalMove(moves) ? this.plyCapScore(height) : -(WIN - height);
    }
    if (depth <= 0) {
      if (moves.length === 0) return -(WIN - height);
      return this.qDepth > 0 ? this.quiesce(alpha, beta, height, this.qDepth) : this.evaluate();
    }

    const key = this.key();
    const alpha0 = alpha;
    let ttMove = -1;
    const entry = this.tt.get(key);
    if (entry) {
      ttMove = entry.move;
      if (entry.depth >= depth) {
        const s = fromTT(entry.score, height);
        if (entry.flag === EXACT) return s;
        if (entry.flag === LOWER && s >= beta) return s;
        if (entry.flag === UPPER && s <= alpha) return s;
      }
    }

    this.order(moves, ttMove, height);
    let best = -INF;
    let bestMove = -1;
    let legal = 0;
    for (const m of moves) {
      this.make(m);
      const k = this.key();
      if (this.seen.has(k) || this.path.has(k)) { this.unmake(m); continue; }
      legal++;
      this.path.add(k);
      let score: number;
      try {
        score = -this.negamax(depth - 1, -beta, -alpha, height + 1);
      } finally {
        this.path.delete(k);
        this.unmake(m);
      }
      if (score > best) { best = score; bestMove = m; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (this.captureCount(m) === 0) {
          if (this.killers[height * 2] !== m) {
            this.killers[height * 2 + 1] = this.killers[height * 2];
            this.killers[height * 2] = m;
          }
          this.historyScore[mFrom(m) * this.n + mTo(m)] += depth * depth;
        }
        break;
      }
    }
    if (legal === 0) return -(WIN - height);

    if (this.tt.size > 400_000) this.tt.clear();
    this.tt.set(key, {
      depth,
      score: toTT(best, height),
      flag: best <= alpha0 ? UPPER : best >= beta ? LOWER : EXACT,
      move: bestMove,
    });
    return best;
  }

  rootMoves(): number[] {
    const moves: number[] = [];
    this.gen(this.turn, moves);
    return moves.filter((m) => {
      this.make(m);
      const k = this.key();
      this.unmake(m);
      return !this.seen.has(k);
    });
  }

  searchRoot(moves: number[], depth: number, wantAllScores: boolean): { scores: Map<number, number>; best: number; bestScore: number } {
    const scores = new Map<number, number>();
    let alpha = -INF;
    let best = moves[0];
    let bestScore = -INF;
    for (const m of moves) {
      this.make(m);
      const k = this.key();
      this.path.add(k);
      let score: number;
      try {
        score = wantAllScores
          ? -this.negamax(depth - 1, -INF, INF, 1)
          : -this.negamax(depth - 1, -INF, -alpha, 1);
      } finally {
        this.path.delete(k);
        this.unmake(m);
      }
      scores.set(m, score);
      if (score > bestScore) { bestScore = score; best = m; }
      if (score > alpha) alpha = score;
    }
    return { scores, best, bestScore };
  }
}

const toTT = (s: number, h: number) => (s > MATE_ZONE ? s + h : s < -MATE_ZONE ? s - h : s);
const fromTT = (s: number, h: number) => (s > MATE_ZONE ? s - h : s < -MATE_ZONE ? s + h : s);
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Picks a move for the side to move. Returns move = null if there is none. */
export function chooseMove(state: GameState, options: SearchOptions): SearchResult {
  const random = options.random ?? Math.random;
  const qDepth = options.qDepth ?? Q_DEPTH;
  const s = new Searcher(state, qDepth);
  let moves = s.rootMoves();
  if (moves.length === 0) return { move: null, score: -WIN, depth: 0, nodes: 0 };

  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }
  if (moves.length === 1) return { move: unpack(moves[0]), score: 0, depth: 0, nodes: 0 };

  // Blunder simulation for casual difficulty
  if (options.blunderRate && options.blunderRate > 0 && random() < options.blunderRate) {
    const blunderIdx = Math.floor(random() * moves.length);
    return { move: unpack(moves[blunderIdx]), score: 0, depth: 1, nodes: 1 };
  }

  s.deadline = now() + options.timeMs;
  let bestMove = moves[0];
  let bestScore = 0;
  let completed = 0;
  let lastScores: Map<number, number> | null = null;

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    try {
      const { scores, best, bestScore: score } = s.searchRoot(moves, depth, options.noise > 0);
      bestMove = best;
      bestScore = score;
      lastScores = scores;
      completed = depth;
      moves = [...moves].sort((a, b) => (b === best ? 1 : 0) - (a === best ? 1 : 0) || (scores.get(b)! - scores.get(a)!));
      if (Math.abs(score) > MATE_ZONE) break;
    } catch (e) {
      if (e instanceof Abort) break;
      throw e;
    }
  }

  if (options.noise > 0 && lastScores) {
    let pick = bestMove;
    let pickScore = -INF;
    for (const [m, sc] of lastScores) {
      const forced = Math.abs(sc) > MATE_ZONE;
      const noisy = sc + (forced ? 0 : (random() * 2 - 1) * options.noise);
      if (noisy > pickScore) { pickScore = noisy; pick = m; }
    }
    bestMove = pick;
    bestScore = lastScores.get(pick) ?? bestScore;
  }

  return { move: unpack(bestMove), score: bestScore, depth: completed, nodes: s.nodes };
}

export function chooseMoveAtLevel(state: GameState, level: Level, random?: () => number): SearchResult {
  return chooseMove(state, { ...LEVELS[level], random });
}
