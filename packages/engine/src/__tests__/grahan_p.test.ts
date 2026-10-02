import { describe, expect, it } from "vitest";
import {
  buildPlane,
  newGame,
  positionFromRows,
  legalMoves,
  legalActions,
  pseudoMoves,
  applyMove,
  applyPass,
  applyAction,
  outcome,
  findCaptures,
  countStones,
  serializeGame,
  deserializeGame,
  replayGame,
  isPass,
  PASS,
  RAHU,
  SURYA,
  EMPTY,
  VARIANTS,
  type Action,
  type GameState,
  type Move,
  type Player,
  type VariantId,
} from "../index";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function pt(q: number, x: number, y: number): number {
  return y * q + x;
}

function findMove(state: GameState, fx: number, fy: number, tx: number, ty: number): Move {
  const from = pt(state.plane.q, fx, fy);
  const to = pt(state.plane.q, tx, ty);
  const move = pseudoMoves(state.board, state.plane, state.turn).find((m) => m.from === from && m.to === to);
  if (!move) {
    throw new Error(`Move (${fx},${fy})->(${tx},${ty}) not found in pseudoMoves`);
  }
  return move;
}

describe("Section 5 - Group A: Regression Tests", () => {
  it("A1. Initial position legal moves and actions for Rahu across all board sizes", () => {
    const expected = [
      { variant: "grahan-4" as VariantId, moves: 18, actions: 19 },
      { variant: "grahan-6" as VariantId, moves: 30, actions: 31 },
      { variant: "grahan-7" as VariantId, moves: 51, actions: 52 },
      { variant: "grahan-8" as VariantId, moves: 76, actions: 77 },
      { variant: "grahan-9" as VariantId, moves: 105, actions: 106 },
      { variant: "grahan-10" as VariantId, moves: 138, actions: 139 },
    ];

    for (const { variant, moves, actions } of expected) {
      const state = newGame(variant);
      expect(state.turn).toBe(RAHU);
      const lMoves = legalMoves(state);
      const lActions = legalActions(state);

      expect(lMoves.length).toBe(moves);
      expect(lActions.length).toBe(actions);
      expect(lActions).toContainEqual(PASS);

      // No first move captures anything
      for (const m of lMoves) {
        const after = applyMove(state, m);
        expect(after.captured[0]).toBe(0);
        expect(after.captured[1]).toBe(0);
        expect(after.lastCaptured.length).toBe(0);
      }
    }
  });

  describe("A2. Capture vectors (n = 6)", () => {
    it("(cap1) Rahu moves (3,1)->(3,3), captures (1,3) and (2,3)", () => {
      const state = positionFromRows("grahan-6", [
        "......",
        "...R..",
        "......",
        "RSS...",
        "......",
        "......",
      ], RAHU);

      const m = findMove(state, 3, 1, 3, 3);
      const next = applyMove(state, m);

      expect(next.lastCaptured).toEqual(expect.arrayContaining([pt(6, 1, 3), pt(6, 2, 3)]));
      expect(next.lastCaptured.length).toBe(2);
      expect(next.captured[0]).toBe(2);

      // Row 3 becomes: R . . R . .
      expect(next.board[pt(6, 0, 3)]).toBe(RAHU);
      expect(next.board[pt(6, 1, 3)]).toBe(EMPTY);
      expect(next.board[pt(6, 2, 3)]).toBe(EMPTY);
      expect(next.board[pt(6, 3, 3)]).toBe(RAHU);
      expect(next.board[pt(6, 4, 3)]).toBe(EMPTY);
      expect(next.board[pt(6, 5, 3)]).toBe(EMPTY);
    });

    it("(cap2) Rahu moves (5,5)->(3,3), captures (3,2) and (2,3) in two directions at once", () => {
      const state = positionFromRows("grahan-6", [
        "......",
        "...R..",
        "...S..",
        ".RS...",
        "......",
        ".....R",
      ], RAHU);

      const m = findMove(state, 5, 5, 3, 3);
      const next = applyMove(state, m);

      expect(next.lastCaptured).toEqual(expect.arrayContaining([pt(6, 3, 2), pt(6, 2, 3)]));
      expect(next.lastCaptured.length).toBe(2);
      expect(next.board[pt(6, 3, 2)]).toBe(EMPTY);
      expect(next.board[pt(6, 2, 3)]).toBe(EMPTY);
      expect(next.board[pt(6, 3, 3)]).toBe(RAHU);
    });

    it("(noself) Rahu moves (1,1)->(1,3) between two Surya stones; nothing captured and Rahu stays", () => {
      const state = positionFromRows("grahan-6", [
        "......",
        ".R....",
        "......",
        "S.S...",
        "......",
        "......",
      ], RAHU);

      const m = findMove(state, 1, 1, 1, 3);
      const next = applyMove(state, m);

      expect(next.lastCaptured.length).toBe(0);
      expect(next.captured[0]).toBe(0);
      expect(next.captured[1]).toBe(0);
      expect(next.board[pt(6, 1, 3)]).toBe(RAHU);
      expect(next.board[pt(6, 0, 3)]).toBe(SURYA);
      expect(next.board[pt(6, 2, 3)]).toBe(SURYA);
    });

    it("(gap) Rahu moves (3,1)->(3,3); nothing captured because empty square (2,3) breaks run", () => {
      const state = positionFromRows("grahan-6", [
        "......",
        "...R..",
        "......",
        "RS....",
        "......",
        "......",
      ], RAHU);

      const m = findMove(state, 3, 1, 3, 3);
      const next = applyMove(state, m);

      expect(next.lastCaptured.length).toBe(0);
      expect(next.captured[0]).toBe(0);
      expect(next.board[pt(6, 1, 3)]).toBe(SURYA);
    });

    it("(edge) Rahu moves (2,4)->(0,4); captures (0,3) on the edge", () => {
      const state = positionFromRows("grahan-6", [
        "......",
        "......",
        "R.....",
        "S.....",
        "..R...",
        "......",
      ], RAHU);

      const m = findMove(state, 2, 4, 0, 4);
      const next = applyMove(state, m);

      expect(next.lastCaptured).toEqual([pt(6, 0, 3)]);
      expect(next.captured[0]).toBe(1);
      expect(next.board[pt(6, 0, 3)]).toBe(EMPTY);
      expect(next.board[pt(6, 0, 4)]).toBe(RAHU);
    });
  });

  describe("A3. Terminal vectors (n = 4, target 3, limit 100)", () => {
    it("(target) Rahu moves (2,0)->(2,2), captures (1,2) giving 3 captures -> Rahu wins immediately", () => {
      const state = positionFromRows("grahan-4", [
        "..R.",
        "....",
        "RS..",
        ".S..",
      ], RAHU, [2, 2], 10);

      const m = findMove(state, 2, 0, 2, 2);
      const next = applyMove(state, m);

      expect(next.lastCaptured).toEqual([pt(4, 1, 2)]);
      expect(next.captured[0]).toBe(3);
      const res = outcome(next);
      expect(res.winner).toBe("rahu");
      expect(res.reason).toBe("target");
    });

    it("(limit-win) Ply counter 99, Surya to move, Rahu 4 stones vs Surya 3. Surya passes -> Rahu wins at ply 100", () => {
      const state = positionFromRows("grahan-4", [
        "....",
        "RR..",
        "RR..",
        ".SSS",
      ], SURYA, [1, 0], 99);

      const next = applyPass(state);
      expect(next.ply).toBe(100);
      const res = outcome(next);
      expect(res.winner).toBe("rahu");
      expect(res.reason).toBe("ply-cap");
    });

    it("(limit-lose) Ply counter 99, Surya to move, Rahu 3 vs Surya 4. Surya passes -> Surya wins at ply 100", () => {
      const state = positionFromRows("grahan-4", [
        "....",
        "RR..",
        "RS..",
        ".SSS",
      ], SURYA, [0, 1], 99);

      const next = applyPass(state);
      expect(next.ply).toBe(100);
      const res = outcome(next);
      expect(res.winner).toBe("surya");
      expect(res.reason).toBe("ply-cap");
    });

    it("(limit-draw) Ply counter 99, Surya to move, 4 vs 4. Surya passes -> Draw at ply 100", () => {
      const state = positionFromRows("grahan-4", [
        "....",
        "RR..",
        "RR..",
        "SSSS",
      ], SURYA, [0, 0], 99);

      const next = applyPass(state);
      expect(next.ply).toBe(100);
      const res = outcome(next);
      expect(res.winner).toBe("draw");
      expect(res.reason).toBe("ply-cap");
    });
  });
});

describe("Section 5 - Group B: New-rule tests", () => {
  it("B1. All-pass game ends exactly at L(n) as a DRAW, H has exactly 2 distinct positions", () => {
    const variants: VariantId[] = ["grahan-4", "grahan-6", "grahan-7", "grahan-8", "grahan-9", "grahan-10"];
    for (const v of variants) {
      let state = newGame(v);
      const limit = state.variant.maxPly;

      for (let ply = 0; ply < limit; ply++) {
        expect(outcome(state).winner).toBeNull();
        expect(legalActions(state)).toContainEqual(PASS);
        state = applyPass(state);
      }

      expect(state.ply).toBe(limit);
      const res = outcome(state);
      expect(res.winner).toBe("draw");
      expect(res.reason).toBe("ply-cap");

      // Exactly 2 distinct positions in H: (initial board, Rahu to move) and (initial board, Surya to move)
      expect(state.seen.size).toBe(2);
      for (const count of state.seen.values()) {
        expect(count).toBeGreaterThanOrEqual(1);
      }
    }
  });

  describe("B2. Examples E1, E2, E3 from Section 3", () => {
    it("E1. Ply 1 Rahu passes, Ply 2 Surya passes -> position equals initial, both passes legal", () => {
      const init = newGame("grahan-4");
      expect(legalActions(init)).toContainEqual(PASS);

      const s1 = applyPass(init);
      expect(s1.ply).toBe(1);
      expect(s1.turn).toBe(SURYA);
      expect(legalActions(s1)).toContainEqual(PASS);

      const s2 = applyPass(s1);
      expect(s2.ply).toBe(2);
      expect(s2.turn).toBe(RAHU);
      expect(s2.key).toBe(init.key);
      expect(s2.seen.get(init.key)).toBe(2);
    });

    it("E2. Continue from E1: Ply 3 Rahu (0,0)->(0,1), Ply 4 Surya passes, at ply 5 Rahu (0,1)->(0,0) is ILLEGAL, pass is legal", () => {
      const init = newGame("grahan-4");
      const s1 = applyPass(init); // Surya to move, key = K_init_surya
      const s2 = applyPass(s1); // Rahu to move, key = K_init_rahu

      // Ply 3: Rahu moves (0,0)->(0,1)
      const m3 = findMove(s2, 0, 0, 0, 1);
      const s3 = applyMove(s2, m3);
      expect(s3.ply).toBe(3);
      expect(s3.turn).toBe(SURYA);

      // Ply 4: Surya passes
      const s4 = applyPass(s3);
      expect(s4.ply).toBe(4);
      expect(s4.turn).toBe(RAHU);

      // At ply 5, Rahu moving (0,1)->(0,0) would create (initial board, Surya to move),
      // which already occurred at ply 1!
      const backwardMove = findMove(s4, 0, 1, 0, 0);
      const movesAt5 = legalMoves(s4);
      expect(movesAt5.some((m) => m.from === backwardMove.from && m.to === backwardMove.to)).toBe(false);

      // Pass is legal at ply 5
      const actionsAt5 = legalActions(s4);
      expect(actionsAt5).toContainEqual(PASS);
    });

    it("E3. No passes: 1. Rahu (0,0)->(0,1) 2. Surya (0,3)->(0,2) 3. Rahu (0,1)->(0,0). Surya (0,2)->(0,3) is ILLEGAL, has 19 moves + 1 pass = 20 legal actions", () => {
      let state = newGame("grahan-4");

      // 1. Rahu (0,0)->(0,1)
      state = applyMove(state, findMove(state, 0, 0, 0, 1));
      // 2. Surya (0,3)->(0,2)
      state = applyMove(state, findMove(state, 0, 3, 0, 2));
      // 3. Rahu (0,1)->(0,0)
      state = applyMove(state, findMove(state, 0, 1, 0, 0));

      // Now it's Surya's turn. Moving (0,2)->(0,3) would recreate initial position (initial board, Rahu to move)
      const illegalSuryaMove = findMove(state, 0, 2, 0, 3);
      const moves = legalMoves(state);
      expect(moves.some((m) => m.from === illegalSuryaMove.from && m.to === illegalSuryaMove.to)).toBe(false);

      // Exactly 19 legal moves + 1 pass = 20 legal actions
      expect(moves.length).toBe(19);
      const actions = legalActions(state);
      expect(actions.length).toBe(20);
      expect(actions).toContainEqual(PASS);
    });
  });

  it("B3. A pass changes nothing except side to move and ply counter; it never captures", () => {
    const state = positionFromRows("grahan-6", [
      "RRRRRR",
      "RRRRRR",
      "......",
      "......",
      "SSSSSS",
      "SSSSSS",
    ], RAHU, [1, 2], 5);

    const next = applyPass(state);
    expect(next.turn).toBe(SURYA);
    expect(next.ply).toBe(6);
    expect(next.board).toEqual(state.board);
    expect(next.captured).toEqual([1, 2]);
    expect(next.lastCaptured).toEqual([]);
    expect(countStones(next.board, RAHU)).toBe(countStones(state.board, RAHU));
    expect(countStones(next.board, SURYA)).toBe(countStones(state.board, SURYA));
  });

  it("B4. No stalemate in GRAHAN-P; pass is the only legal action and game continues. Under 'original' it is a loss", () => {
    // Rahu to move, ply 10, board:
    // R R S .
    // S S S .
    // . . . .
    // . . . .
    const stateP = positionFromRows("grahan-4", [
      "RRS.",
      "SSS.",
      "....",
      "....",
    ], RAHU, [0, 2], 10, undefined, "grahan-p");

    expect(pseudoMoves(stateP.board, stateP.plane, RAHU).length).toBe(0);
    expect(legalMoves(stateP).length).toBe(0);
    expect(legalActions(stateP)).toEqual([PASS]);
    expect(outcome(stateP).winner).toBeNull();

    const afterPass = applyPass(stateP);
    expect(afterPass.turn).toBe(SURYA);
    expect(afterPass.ply).toBe(11);
    expect(outcome(afterPass).winner).toBeNull();

    // Under ruleset "original", this same position is a loss for Rahu
    const stateOrig = positionFromRows("grahan-4", [
      "RRS.",
      "SSS.",
      "....",
      "....",
    ], RAHU, [0, 2], 10, undefined, "original");

    expect(legalActions(stateOrig)).toEqual([]);
    const resOrig = outcome(stateOrig);
    expect(resOrig.winner).toBe("surya");
    expect(resOrig.reason).toBe("trapped");
  });

  it("B5. Pass is legal at ply 0 and at ply L(n) (ends game via T2)", () => {
    const s0 = newGame("grahan-4");
    expect(legalActions(s0)).toContainEqual(PASS);

    const s99 = positionFromRows("grahan-4", [
      "....",
      "RR..",
      "RR..",
      ".SSS",
    ], SURYA, [1, 0], 99);

    expect(legalActions(s99)).toContainEqual(PASS);
    const s100 = applyPass(s99);
    expect(s100.ply).toBe(100);
    expect(outcome(s100).winner).toBe("rahu");
    expect(outcome(s100).reason).toBe("ply-cap");
  });

  it("B6. Take-back / undo / unmake: multiset counts restore correctly", () => {
    const s0 = newGame("grahan-4");
    const k0 = s0.key;
    expect(s0.seen.get(k0)).toBe(1);

    const s1 = applyPass(s0);
    const s2 = applyPass(s1);
    expect(s2.seen.get(k0)).toBe(2);

    // Timeline undo simulation
    const timeline = [s0, s1, s2];
    const undone1 = timeline[timeline.length - 2];
    expect(undone1.seen.get(k0)).toBe(1);

    const undone2 = timeline[0];
    expect(undone2.seen.get(k0)).toBe(1);
    expect(undone2.seen.size).toBe(1);

    // Interleaved moves and passes
    let s = newGame("grahan-4");
    const m = legalMoves(s)[0];
    const sAfterMove = applyMove(s, m);
    const sAfterPass = applyPass(sAfterMove);
    const sAfterPass2 = applyPass(sAfterPass);

    expect(sAfterPass2.seen.get(sAfterMove.key)).toBe(2);
  });

  it("B7. Save/load/replay with passes and backward compatibility", () => {
    const s0 = newGame("grahan-4");
    const m1 = legalMoves(s0)[0];
    const actions: Action[] = [m1, PASS, PASS];

    let current = s0;
    for (const a of actions) current = applyAction(current, a);

    const json = serializeGame(current, actions);
    const loaded = deserializeGame(json);

    expect(loaded.state.board).toEqual(current.board);
    expect(loaded.state.turn).toEqual(current.turn);
    expect(loaded.state.ply).toEqual(current.ply);
    expect(loaded.state.key).toEqual(current.key);
    expect(Array.from(loaded.state.seen.entries())).toEqual(Array.from(current.seen.entries()));

    // Old format snapshot loads properly
    const oldSnapshot = {
      variant: "grahan-4" as VariantId,
      board: Array.from(current.board),
      turn: current.turn,
      captured: [current.captured[0], current.captured[1]] as [number, number],
      ply: current.ply,
      seen: Array.from(current.seen.keys()),
    };
    const loadedOld = deserializeGame(JSON.stringify(oldSnapshot));
    expect(loadedOld.state.board).toEqual(current.board);
    expect(loadedOld.state.turn).toEqual(current.turn);
  });
});

describe("Section 5 - Group C: Property tests", () => {
  it("C1. Random legal actions until terminal satisfy game invariants", () => {
    const rng = seeded(123456);
    const variants: VariantId[] = ["grahan-4", "grahan-6", "grahan-7", "grahan-8", "grahan-9", "grahan-10"];

    for (const v of variants) {
      for (let gameIdx = 0; gameIdx < 5; gameIdx++) {
        let state = newGame(v);
        const maxPly = state.variant.maxPly;
        let lastMoveAction = false;
        let prevRahuCount = countStones(state.board, RAHU);
        let prevSuryaCount = countStones(state.board, SURYA);

        while (outcome(state).winner === null) {
          const actions = legalActions(state);
          expect(actions.length).toBeGreaterThan(0);
          expect(actions).toContainEqual(PASS);

          const choice = actions[Math.floor(rng() * actions.length)];
          const isMove = !isPass(choice);
          lastMoveAction = isMove;

          const mover = state.turn;
          const next = applyAction(state, choice);

          // (i) Game ends at or before maxPly
          expect(next.ply).toBeLessThanOrEqual(maxPly);

          const curR = countStones(next.board, RAHU);
          const curS = countStones(next.board, SURYA);

          // (ii) No stone count ever increases
          expect(curR).toBeLessThanOrEqual(prevRahuCount);
          expect(curS).toBeLessThanOrEqual(prevSuryaCount);

          // (iii) A stone is only removed on a move, and only enemy stones are removed
          if (!isMove) {
            expect(curR).toBe(prevRahuCount);
            expect(curS).toBe(prevSuryaCount);
          } else {
            if (mover === RAHU) expect(curR).toBe(prevRahuCount);
            if (mover === SURYA) expect(curS).toBe(prevSuryaCount);
          }

          // (iv) No MOVE ever creates a position already in H
          if (isMove) {
            expect((state.seen.get(next.key) ?? 0)).toBe(0);
          }

          prevRahuCount = curR;
          prevSuryaCount = curS;
          state = next;
        }

        // (v) Final result agrees with K3 and stone counts
        const finalResult = outcome(state);
        expect(finalResult.winner).not.toBeNull();
        if (finalResult.reason === "target") {
          const t = state.variant.captureTarget;
          expect(state.captured[0] >= t || state.captured[1] >= t).toBe(true);
        } else if (finalResult.reason === "ply-cap") {
          expect(state.ply).toBe(maxPly);
          const r = countStones(state.board, RAHU);
          const s = countStones(state.board, SURYA);
          const expectedWinner = r > s ? "rahu" : s > r ? "surya" : "draw";
          expect(finalResult.winner).toBe(expectedWinner);
        }
      }
    }
  });

  describe("C2. FORTRESS PROPERTY (The key test for the mathematical proof)", () => {
    const variants: VariantId[] = ["grahan-4", "grahan-6", "grahan-7", "grahan-8", "grahan-9", "grahan-10"];

    for (const v of variants) {
      for (const X of [RAHU, SURYA] as const) {
        it(`${v}: Player ${X === RAHU ? "Rahu" : "Surya"} passes every turn against random moves -> DRAW`, () => {
          const rng = seeded(9876 + X * 100);
          const opp = (X === RAHU ? SURYA : RAHU);

          for (let gameIdx = 0; gameIdx < 20; gameIdx++) {
            let state = newGame(v);
            const q = state.plane.q;
            const k = q === 4 ? 1 : 2;
            const limit = state.variant.maxPly;
            const originalStones = state.variant.stones;

            while (outcome(state).winner === null) {
              if (state.turn === X) {
                state = applyPass(state);
              } else {
                // Opponent plays uniformly random legal MOVES (only passes if no legal move)
                const moves = legalMoves(state);
                if (moves.length > 0) {
                  const m = moves[Math.floor(rng() * moves.length)];
                  state = applyMove(state, m);
                } else {
                  state = applyPass(state);
                }
              }

              // Assert after EVERY ply:
              // X's stones occupy exactly X's home band
              const xStonesCount = countStones(state.board, X);
              expect(xStonesCount).toBe(originalStones);

              for (let y = 0; y < q; y++) {
                for (let x = 0; x < q; x++) {
                  const p = pt(q, x, y);
                  const isHome = X === RAHU ? y < k : y >= q - k;
                  if (isHome) {
                    expect(state.board[p]).toBe(X);
                  } else {
                    expect(state.board[p]).not.toBe(X);
                  }
                }
              }

              // Opponent has captured nothing from X
              const oppCaptures = state.captured[opp === RAHU ? 0 : 1];
              expect(oppCaptures).toBe(0);
            }

            expect(state.ply).toBe(limit);
            const res = outcome(state);
            expect(res.winner).toBe("draw");
          }
        });

        it(`${v}: Player ${X === RAHU ? "Rahu" : "Surya"} passes every turn against aggressive moves landing close to home band -> DRAW`, () => {
          const rng = seeded(54321 + X * 200);
          const opp = (X === RAHU ? SURYA : RAHU);

          for (let gameIdx = 0; gameIdx < 20; gameIdx++) {
            let state = newGame(v);
            const q = state.plane.q;
            const k = q === 4 ? 1 : 2;
            const limit = state.variant.maxPly;
            const originalStones = state.variant.stones;

            while (outcome(state).winner === null) {
              if (state.turn === X) {
                state = applyPass(state);
              } else {
                // Opponent prefers moves landing closer to X's home band
                const moves = legalMoves(state);
                if (moves.length > 0) {
                  // Distance to X's home band
                  const targetY = X === RAHU ? k - 1 : q - k;
                  moves.sort((a, b) => {
                    const distA = Math.abs(state.plane.y(a.to) - targetY);
                    const distB = Math.abs(state.plane.y(b.to) - targetY);
                    return distA - distB || (rng() - 0.5);
                  });
                  state = applyMove(state, moves[0]);
                } else {
                  state = applyPass(state);
                }
              }

              // Assert after EVERY ply:
              expect(countStones(state.board, X)).toBe(originalStones);
              for (let y = 0; y < q; y++) {
                for (let x = 0; x < q; x++) {
                  const p = pt(q, x, y);
                  const isHome = X === RAHU ? y < k : y >= q - k;
                  if (isHome) expect(state.board[p]).toBe(X);
                  else expect(state.board[p]).not.toBe(X);
                }
              }
              expect(state.captured[opp === RAHU ? 0 : 1]).toBe(0);
            }

            expect(state.ply).toBe(limit);
            expect(outcome(state).winner).toBe("draw");
          }
        });
      }
    }
  });

  it("C3. EXHAUSTIVE FORTRESS CHECK for n = 4: Exactly 1588 placements checked, no enemy move captures anything", () => {
    let placementsChecked = 0;
    const plane = buildPlane(4);

    for (const X of [RAHU, SURYA] as const) {
      const opp = X === RAHU ? SURYA : RAHU;
      const xRow = X === RAHU ? 0 : 3;
      const outsideSquares: number[] = [];
      for (let y = 0; y < 4; y++) {
        if (y === xRow) continue;
        for (let x = 0; x < 4; x++) {
          outsideSquares.push(pt(4, x, y));
        }
      }
      expect(outsideSquares.length).toBe(12);

      // Function to generate all subsets of outsideSquares of size 0, 1, 2, 3, 4
      function checkCombinations(count: number) {
        function backtrack(start: number, chosen: number[]) {
          if (chosen.length === count) {
            placementsChecked++;
            // Setup board: X fills xRow, opp stones at chosen positions
            const board = new Uint8Array(16);
            for (let x = 0; x < 4; x++) board[pt(4, x, xRow)] = X;
            for (const p of chosen) board[p] = opp;

            // Check every geometrically valid enemy move
            const moves = pseudoMoves(board, plane, opp);
            for (const m of moves) {
              board[m.from] = EMPTY;
              board[m.to] = opp;
              const caps = findCaptures(board, plane, m.to, opp);
              board[m.to] = EMPTY;
              board[m.from] = opp;

              if (caps.length > 0) {
                expect(caps.length).toBe(0);
              }
            }
            return;
          }
          for (let i = start; i < outsideSquares.length; i++) {
            chosen.push(outsideSquares[i]);
            backtrack(i + 1, chosen);
            chosen.pop();
          }
        }
        backtrack(0, []);
      }

      for (let k = 0; k <= 4; k++) {
        checkCombinations(k);
      }
    }

    // Spec assertion: Assert exactly 1588 placements were checked
    expect(placementsChecked).toBe(1588);
  }, 60000);

  it("C4. Random-sample version of C3 for n = 6, 7, 8, 9, 10: 500 placements per color", () => {
    const rng = seeded(777);
    const variants: VariantId[] = ["grahan-6", "grahan-7", "grahan-8", "grahan-9", "grahan-10"];

    for (const v of variants) {
      const q = VARIANTS[v].q;
      const plane = buildPlane(q);
      const P = VARIANTS[v].stones;
      const outsideSquares: number[] = [];

      for (const X of [RAHU, SURYA] as const) {
        const opp = X === RAHU ? SURYA : RAHU;
        outsideSquares.length = 0;
        for (let y = 0; y < q; y++) {
          const isHome = X === RAHU ? y < 2 : y >= q - 2;
          if (isHome) continue;
          for (let x = 0; x < q; x++) outsideSquares.push(pt(q, x, y));
        }

        const avail = new Int32Array(outsideSquares.length);
        const board = new Uint8Array(q * q);

        for (let sample = 0; sample < 500; sample++) {
          const numStones = 1 + Math.floor(rng() * P);
          // Pick numStones distinct squares outside X's home band using partial in-place selection
          avail.set(outsideSquares);
          let availLen = outsideSquares.length;

          // Clear board and fill X's home band
          board.fill(EMPTY);
          for (let y = 0; y < q; y++) {
            const isHome = X === RAHU ? y < 2 : y >= q - 2;
            if (isHome) {
              for (let x = 0; x < q; x++) board[pt(q, x, y)] = X;
            }
          }

          for (let i = 0; i < numStones; i++) {
            const idx = Math.floor(rng() * availLen);
            const sq = avail[idx];
            board[sq] = opp;
            avail[idx] = avail[availLen - 1];
            availLen--;
          }

          // Every geometrically valid enemy move captures nothing
          const moves = pseudoMoves(board, plane, opp);
          for (const m of moves) {
            board[m.from] = EMPTY;
            board[m.to] = opp;
            const caps = findCaptures(board, plane, m.to, opp);
            board[m.to] = EMPTY;
            board[m.from] = opp;

            if (caps.length > 0) {
              expect(caps.length).toBe(0);
            }
          }
        }
      }
    }
  }, 120000);
});
