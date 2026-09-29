/**
 * @grahan/ai — Heuristic Evaluation Function
 *
 * Evaluates a game position from the perspective of the current player (Negamax convention).
 *
 * Eval(s) = 100 * (myStones - oppStones)
 *         +   1 * (myMobility - oppMobility)
 *         +  10 * (myThreats - oppThreats)
 *
 * Where:
 * - Stones: piece count differential
 * - Mobility: number of legal moves available
 * - Threats: lines where an enemy run has a vacant bracket gap
 *   (i.e., you could complete a capture if you moved there)
 */

import {
  type GameState,
  CellState,
  type Player,
  GameResult,
  legalMoves,
  checkGameResult,
  opponent,
} from '@grahan/engine';

const WIN_SCORE = 100_000;
const LOSS_SCORE = -100_000;

/**
 * Counts "threats" for a player: lines where the player could potentially
 * complete a custodial capture. A threat exists when along a line through
 * a player's stone, there's a contiguous run of enemy stones terminated
 * by an empty cell (where a friendly stone could land to capture).
 */
function countThreats(state: GameState, player: Player): number {
  const { board, plane } = state;
  const enemy = opponent(player);
  const q = plane.order;
  let threats = 0;

  for (let pt = 0; pt < plane.numPoints; pt++) {
    if (board[pt] !== player) continue;

    const lines = plane.linesThrough(pt);
    for (const lineId of lines) {
      const pts = plane.linePoints(lineId);
      const myIdx = pts.indexOf(pt);

      // Check both directions
      for (const dir of [1, -1] as const) {
        // Look for: [friendly] [enemy...] [empty]
        // The empty cell is where a friendly could land to complete capture
        let hasEnemyRun = false;
        for (let step = 1; step < q; step++) {
          const checkIdx = ((myIdx + dir * step) % q + q) % q;
          const checkPt = pts[checkIdx];

          if (board[checkPt] === enemy) {
            hasEnemyRun = true;
          } else if (board[checkPt] === CellState.Empty) {
            if (hasEnemyRun) threats++;
            break;
          } else {
            // Another friendly — not a threat setup (already bracketed or same side)
            break;
          }
        }
      }
    }
  }

  return threats;
}

/**
 * Evaluates the position from the perspective of `state.turn`.
 * Returns a score where positive = good for the side to move.
 */
export function evaluate(state: GameState): number {
  const result = checkGameResult(state);

  if (result === GameResult.BlackWins) {
    return state.turn === CellState.Black ? WIN_SCORE : LOSS_SCORE;
  }
  if (result === GameResult.WhiteWins) {
    return state.turn === CellState.White ? WIN_SCORE : LOSS_SCORE;
  }
  if (result === GameResult.Draw) {
    return 0;
  }

  const me = state.turn;
  const opp = opponent(me);

  // Stone count
  let myStones = 0;
  let oppStones = 0;
  for (let i = 0; i < state.plane.numPoints; i++) {
    if (state.board[i] === me) myStones++;
    else if (state.board[i] === opp) oppStones++;
  }

  // Captures differential (captures I've made vs captures opponent has made)
  const myCaps = me === CellState.Black ? state.captured[0] : state.captured[1];
  const oppCaps = me === CellState.Black ? state.captured[1] : state.captured[0];

  // Mobility (legal move count)
  const myMobility = legalMoves(state).length;

  // Threats
  const myThreats = countThreats(state, me);
  const oppThreats = countThreats(state, opp);

  return (
    100 * (myStones - oppStones) +
    200 * (myCaps - oppCaps) +
    1 * myMobility +
    10 * (myThreats - oppThreats)
  );
}

export { WIN_SCORE, LOSS_SCORE };
