/**
 * Standalone Game Engine for Frontend
 *
 * Self-contained implementation of the math + engine packages adapted
 * for direct use in the Next.js frontend without workspace dependency resolution.
 * Contains: GF(q) arithmetic, AG(2,q) incidence, game state, moves, captures, AI.
 */

// ═══════════════════════════════════════════════════════════════════
//  GALOIS FIELD ARITHMETIC
// ═══════════════════════════════════════════════════════════════════

export interface Field {
  readonly order: number;
  add(a: number, b: number): number;
  sub(a: number, b: number): number;
  mul(a: number, b: number): number;
  inv(a: number): number;
  neg(a: number): number;
  elements(): number[];
}

export function gfPrime(p: number): Field {
  const inverses = new Array<number>(p);
  inverses[0] = NaN;
  for (let a = 1; a < p; a++) {
    for (let b = 1; b < p; b++) {
      if ((a * b) % p === 1) { inverses[a] = b; break; }
    }
  }
  return {
    order: p,
    add: (a, b) => ((a + b) % p + p) % p,
    sub: (a, b) => ((a - b) % p + p) % p,
    mul: (a, b) => ((a * b) % p + p) % p,
    inv: (a) => { if (a === 0) throw new Error('No inverse for 0'); return inverses[a]; },
    neg: (a) => (p - a) % p,
    elements: () => Array.from({ length: p }, (_, i) => i),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  AFFINE PLANE AG(2, q)
// ═══════════════════════════════════════════════════════════════════

export interface IncidenceStructure {
  readonly order: number;
  readonly numPoints: number;
  readonly numLines: number;
  pointIndex(x: number, y: number): number;
  pointCoords(index: number): [number, number];
  linePoints(lineId: number): readonly number[];
  linesThrough(pointId: number): readonly number[];
  lineThrough(p1: number, p2: number): number;
  neighbors(pointId: number): readonly number[];
  lineSlope(lineId: number): number;
  readonly field: Field;
}

export function buildAffinePlane(field: Field): IncidenceStructure {
  const q = field.order;
  const numPoints = q * q;
  const numLines = q * (q + 1);
  const elems = field.elements();

  const linePointsMap: number[][] = new Array(numLines);
  const linesOfPoint: number[][] = new Array(numPoints);
  for (let i = 0; i < numPoints; i++) linesOfPoint[i] = [];

  // Finite slope lines: y = m*x + b
  for (let mi = 0; mi < q; mi++) {
    const m = elems[mi];
    for (let bi = 0; bi < q; bi++) {
      const b = elems[bi];
      const lineId = mi * q + bi;
      const points: number[] = new Array(q);
      for (let xi = 0; xi < q; xi++) {
        const x = elems[xi];
        const y = field.add(field.mul(m, x), b);
        const pid = y * q + x;
        points[xi] = pid;
        linesOfPoint[pid].push(lineId);
      }
      linePointsMap[lineId] = points;
    }
  }

  // Vertical lines: x = a
  for (let ai = 0; ai < q; ai++) {
    const a = elems[ai];
    const lineId = q * q + ai;
    const points: number[] = new Array(q);
    for (let yi = 0; yi < q; yi++) {
      const y = elems[yi];
      const pid = y * q + a;
      points[yi] = pid;
      linesOfPoint[pid].push(lineId);
    }
    linePointsMap[lineId] = points;
  }

  // Pair-to-line lookup
  const pairToLine = new Int32Array(numPoints * numPoints).fill(-1);
  for (let lid = 0; lid < numLines; lid++) {
    const pts = linePointsMap[lid];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        pairToLine[pts[i] * numPoints + pts[j]] = lid;
        pairToLine[pts[j] * numPoints + pts[i]] = lid;
      }
    }
  }

  // Neighbors
  const neighborsMap: number[][] = new Array(numPoints);
  for (let pid = 0; pid < numPoints; pid++) {
    const s = new Set<number>();
    for (const lid of linesOfPoint[pid]) {
      const pts = linePointsMap[lid];
      const idx = pts.indexOf(pid);
      s.add(pts[(idx + 1) % q]);
      s.add(pts[(idx - 1 + q) % q]);
    }
    neighborsMap[pid] = Array.from(s);
  }

  return {
    order: q,
    numPoints,
    numLines,
    field,
    pointIndex: (x, y) => y * q + x,
    pointCoords: (i) => [i % q, Math.floor(i / q)],
    linePoints: (lid) => linePointsMap[lid],
    linesThrough: (pid) => linesOfPoint[pid],
    lineThrough: (p1, p2) => {
      if (p1 === p2) throw new Error('Same point');
      return pairToLine[p1 * numPoints + p2];
    },
    neighbors: (pid) => neighborsMap[pid],
    lineSlope: (lid) => lid >= q * q ? q : Math.floor(lid / q),
  };
}

// ═══════════════════════════════════════════════════════════════════
//  GAME TYPES
// ═══════════════════════════════════════════════════════════════════

export const CellState = { Empty: 0, Black: 1, White: 2 } as const;
export type CellStateType = 0 | 1 | 2;
export type Player = 1 | 2;

export function opponent(p: Player): Player { return p === 1 ? 2 : 1; }

export interface Move {
  from: number;
  to: number;
  lineId: number;
}

export interface GameState {
  board: Uint8Array;
  turn: Player;
  captured: [number, number];
  ply: number;
  hash: string;
  history: Set<string>;
  plane: IncidenceStructure;
  captureTarget: number;
  maxPly: number;
  lastMove?: Move;
  lastCaptured?: number[];
}

export const GameResult = { Ongoing: 0, BlackWins: 1, WhiteWins: 2, Draw: 3 } as const;
export type GameResultType = 0 | 1 | 2 | 3;

// ═══════════════════════════════════════════════════════════════════
//  HASHING (simple string hash for browser, no BigInt needed)
// ═══════════════════════════════════════════════════════════════════

function hashState(board: Uint8Array, turn: Player): string {
  // Fast string encoding of the board state + turn
  let h = '';
  for (let i = 0; i < board.length; i++) h += board[i];
  h += '_' + turn;
  return h;
}

// ═══════════════════════════════════════════════════════════════════
//  GAME STATE CREATION
// ═══════════════════════════════════════════════════════════════════

export function createInitialState(order: number, captureTarget: number, maxPly: number): GameState {
  const field = gfPrime(order);
  const plane = buildAffinePlane(field);
  const board = new Uint8Array(plane.numPoints);

  if (order === 3) {
    for (let x = 0; x < 3; x++) board[plane.pointIndex(x, 0)] = CellState.Black;
    for (let x = 0; x < 3; x++) board[plane.pointIndex(x, 2)] = CellState.White;
  } else if (order === 5) {
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 5; x++) board[plane.pointIndex(x, y)] = CellState.Black;
    for (let y = 3; y < 5; y++)
      for (let x = 0; x < 5; x++) board[plane.pointIndex(x, y)] = CellState.White;
  }

  const hash = hashState(board, CellState.Black as Player);
  return {
    board, turn: CellState.Black as Player,
    captured: [0, 0], ply: 0, hash,
    history: new Set([hash]),
    plane, captureTarget, maxPly,
  };
}

export function createGrahan3(): GameState { return createInitialState(3, 2, 60); }
export function createGrahan5(): GameState { return createInitialState(5, 4, 0); }

// ═══════════════════════════════════════════════════════════════════
//  CUSTODIAL CAPTURE
// ═══════════════════════════════════════════════════════════════════

export function resolveCustodialCapture(
  board: Uint8Array, landingPoint: number, mover: Player, plane: IncidenceStructure,
): number[] {
  const enemy = opponent(mover);
  const q = plane.order;
  const captured: number[] = [];
  const capturedSet = new Set<number>();
  const [lx, ly] = [landingPoint % q, Math.floor(landingPoint / q)];
  const lines = plane.linesThrough(landingPoint);

  for (const lineId of lines) {
    const pts = plane.linePoints(lineId);
    const myIdx = pts.indexOf(landingPoint);

    for (const dir of [1, -1]) {
      const nextIdx = ((myIdx + dir) % q + q) % q;
      const nextPt = pts[nextIdx];
      const [nx, ny] = [nextPt % q, Math.floor(nextPt / q)];
      let dx = (nx - lx + q) % q;
      let dy = (ny - ly + q) % q;
      if (dx > q / 2) dx -= q;
      if (dy > q / 2) dy -= q;

      const run: number[] = [];
      let cx = lx;
      let cy = ly;

      for (let step = 1; step < q; step++) {
        cx += dx;
        cy += dy;
        if (cx < 0 || cx >= q || cy < 0 || cy >= q) break;

        const checkPt = cy * q + cx;
        if (board[checkPt] === enemy) {
          run.push(checkPt);
        } else if (board[checkPt] === mover) {
          if (checkPt !== landingPoint && run.length > 0) {
            for (const cap of run) {
              if (!capturedSet.has(cap)) { capturedSet.add(cap); captured.push(cap); }
            }
          }
          break;
        } else {
          break;
        }
      }
    }
  }
  return captured;
}

// ═══════════════════════════════════════════════════════════════════
//  LEGAL MOVE GENERATION
// ═══════════════════════════════════════════════════════════════════

export function legalMoves(state: GameState): Move[] {
  const { board, turn, plane } = state;
  const q = plane.order;
  const moves: Move[] = [];

  for (let from = 0; from < plane.numPoints; from++) {
    if (board[from] !== turn) continue;
    const lines = plane.linesThrough(from);
    for (const lineId of lines) {
      const pts = plane.linePoints(lineId);
      const myIdx = pts.indexOf(from);
      for (const dir of [1, -1]) {
        for (let step = 1; step < q; step++) {
          const nextIdx = ((myIdx + dir * step) % q + q) % q;
          const to = pts[nextIdx];
          if (board[to] !== CellState.Empty) break;
          moves.push({ from, to, lineId });
        }
      }
    }
  }
  return moves;
}

export function slidesFrom(state: GameState, from: number): Move[] {
  const { board, plane } = state;
  const q = plane.order;
  const moves: Move[] = [];
  const lines = plane.linesThrough(from);
  for (const lineId of lines) {
    const pts = plane.linePoints(lineId);
    const myIdx = pts.indexOf(from);
    for (const dir of [1, -1]) {
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

// ═══════════════════════════════════════════════════════════════════
//  APPLY MOVE
// ═══════════════════════════════════════════════════════════════════

export function applyMove(state: GameState, move: Move): GameState {
  const newBoard = new Uint8Array(state.board);
  newBoard[move.from] = CellState.Empty;
  newBoard[move.to] = state.turn;

  const captured = resolveCustodialCapture(newBoard, move.to, state.turn, state.plane);
  for (const cap of captured) newBoard[cap] = CellState.Empty;

  const nextTurn = opponent(state.turn);
  const hash = hashState(newBoard, nextTurn);
  const newHistory = new Set(state.history);
  newHistory.add(hash);

  const newCaptured: [number, number] = [state.captured[0], state.captured[1]];
  if (state.turn === CellState.Black) newCaptured[0] += captured.length;
  else newCaptured[1] += captured.length;

  return {
    board: newBoard,
    turn: nextTurn,
    captured: newCaptured,
    ply: state.ply + 1,
    hash,
    history: newHistory,
    plane: state.plane,
    captureTarget: state.captureTarget,
    maxPly: state.maxPly,
    lastMove: move,
    lastCaptured: captured.length > 0 ? captured : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  GAME RESULT CHECK
// ═══════════════════════════════════════════════════════════════════

export function checkGameResult(state: GameState): GameResultType {
  if (state.captured[0] >= state.captureTarget) return GameResult.BlackWins;
  if (state.captured[1] >= state.captureTarget) return GameResult.WhiteWins;

  const moves = legalMoves(state);
  if (moves.length === 0) {
    return state.turn === CellState.Black ? GameResult.WhiteWins : GameResult.BlackWins;
  }

  if (state.maxPly > 0 && state.ply >= state.maxPly) {
    let b = 0, w = 0;
    for (let i = 0; i < state.plane.numPoints; i++) {
      if (state.board[i] === CellState.Black) b++;
      if (state.board[i] === CellState.White) w++;
    }
    return b > w ? GameResult.BlackWins : w > b ? GameResult.WhiteWins : GameResult.Draw;
  }

  return GameResult.Ongoing;
}

// ═══════════════════════════════════════════════════════════════════
//  AI — Simple Negamax with Alpha-Beta
// ═══════════════════════════════════════════════════════════════════

const WIN = 100000;

function evaluate(state: GameState): number {
  const result = checkGameResult(state);
  if (result === GameResult.BlackWins) return state.turn === CellState.Black ? WIN : -WIN;
  if (result === GameResult.WhiteWins) return state.turn === CellState.White ? WIN : -WIN;
  if (result === GameResult.Draw) return 0;

  const me = state.turn;
  const opp = opponent(me);
  let myStones = 0, oppStones = 0;
  for (let i = 0; i < state.plane.numPoints; i++) {
    if (state.board[i] === me) myStones++;
    else if (state.board[i] === opp) oppStones++;
  }
  const myCaps = me === 1 ? state.captured[0] : state.captured[1];
  const oppCaps = me === 1 ? state.captured[1] : state.captured[0];
  const mobility = legalMoves(state).length;

  return 100 * (myStones - oppStones) + 200 * (myCaps - oppCaps) + mobility;
}

function negamax(state: GameState, depth: number, alpha: number, beta: number): number {
  const result = checkGameResult(state);
  if (result !== GameResult.Ongoing) return evaluate(state);
  if (depth === 0) return evaluate(state);

  const moves = legalMoves(state);
  if (moves.length === 0) return -WIN + state.ply;

  let best = -Infinity;
  for (const move of moves) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

export function findBestMove(state: GameState, difficulty: 1 | 2 | 3): Move | null {
  const depthMap = { 1: 1, 2: 2, 3: 3 };
  const maxDepth = depthMap[difficulty];
  const moves = legalMoves(state);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = applyMove(state, move);
    const score = -negamax(next, maxDepth - 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
