import { describe, expect, it } from "vitest";
import {
  buildPlane,
  newGame, positionFromRows, legalMoves, pseudoMoves, applyMove, outcome, findCaptures,
  movePath, moveWraps, toSnapshot, fromSnapshot, threatenedStones,
  chooseMove, chooseMoveAtLevel, LEVELS, HINT_OPTIONS, RAHU, SURYA, EMPTY, VARIANTS, currentTurn, completedTurns,
  type GameState, type Move,
} from "../index";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

describe("Straight-line & diagonal geometry", () => {
  for (const q of [6, 7, 8, 9, 10]) {
    it(`Plane(${q}) has correct points and bounds`, () => {
      const P = buildPlane(q);
      expect(P.numPoints).toBe(q * q);
      expect(P.lines.length).toBeGreaterThan(0);
      for (const l of P.lines) {
        expect(l.length).toBeGreaterThanOrEqual(2);
        for (const p of l) {
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThan(q * q);
        }
      }
      for (let p = 0; p < P.numPoints; p++) {
        expect(P.linesThrough[p].length).toBeGreaterThanOrEqual(2);
      }
    });

    it(`capture rays of Plane(${q}) stay strictly inside the grid`, () => {
      const P = buildPlane(q);
      for (let p = 0; p < P.numPoints; p++) {
        for (const ray of P.captureRays[p]) {
          for (const c of ray.cells) {
            expect(c).toBeGreaterThanOrEqual(0);
            expect(c).toBeLessThan(q * q);
          }
        }
      }
    });
  }
});

describe("Move generation", () => {
  it("never wraps around edges", () => {
    const s = positionFromRows("grahan-6", [
      "R.....",
      "......",
      "......",
      "......",
      "......",
      "......",
    ]);
    const P = s.plane;
    const moves = legalMoves(s);
    for (const m of moves) {
      expect(moveWraps(P, m)).toBe(false);
      const path = movePath(P, m);
      for (const pt of path) {
        expect(pt).toBeGreaterThanOrEqual(0);
        expect(pt).toBeLessThan(36);
      }
    }
    // Rahu at (0, 0) can move right (5 steps), down (5 steps), and diagonal down-right (5 steps) = 15 moves
    expect(moves.length).toBe(15);
  });

  it("stones cannot jump over blocking stones", () => {
    const s = positionFromRows("grahan-6", [
      "R.....",
      "S.....",
      "......",
      "......",
      "......",
      "......",
    ]);
    const P = s.plane;
    // Moving down along column 0 should be completely blocked by S at (0, 1)
    const moves = legalMoves(s);
    const colMoves = moves.filter((m) => P.x(m.to) === 0);
    expect(colMoves.length).toBe(0);
  });

  it("opening move counts for 6×6", () => {
    const s = newGame("grahan-6");
    expect(s.variant.stones).toBe(12);
    expect(s.variant.captureTarget).toBe(5);
    const moves = legalMoves(s);
    expect(moves.length).toBeGreaterThan(0);
  });
});

describe("Custodial capture", () => {
  it("captures a sandwiched stone along row", () => {
    const s = positionFromRows("grahan-6", [
      "......",
      "R.SR..",
      "......",
      "......",
      "......",
      "......",
    ]);
    // Rahu at (0, 1) slides to (1, 1). Sandwiches S at (2, 1) between (1, 1) and R at (3, 1).
    const P = s.plane;
    const m = legalMoves(s).find((mv) => mv.from === P.point(0, 1) && mv.to === P.point(1, 1))!;
    expect(m).toBeDefined();
    const after = applyMove(s, m);
    expect(after.lastCaptured).toEqual([P.point(2, 1)]);
    expect(after.captured).toEqual([1, 0]);
    expect(after.board[P.point(2, 1)]).toBe(EMPTY);
  });

  it("sliding between two enemy stones gets captured by default", () => {
    const s = positionFromRows("grahan-6", [
      "......",
      "S.S...",
      ".R....",
      "......",
      "......",
      "......",
    ], RAHU);
    const P = s.plane;
    // Slide R from (1, 2) to (1, 1) directly between S at (0, 1) and S at (2, 1)
    const m = legalMoves(s).find((mv) => mv.to === P.point(1, 1))!;
    expect(m).toBeDefined();
    const after = applyMove(s, m);
    expect(after.board[P.point(1, 1)]).toBe(EMPTY);
    expect(after.captured).toEqual([0, 1]);
    expect(after.lastCaptured).toEqual([P.point(1, 1)]);
  });

  it("moving into a space with an empty gap next to enemy is not captured", () => {
    const s = positionFromRows("grahan-6", [
      "......",
      "S..S..",
      ".R....",
      "......",
      "......",
      "......",
    ], RAHU);
    const P = s.plane;
    // Slide R from (1, 2) to (2, 1); (1, 1) is still empty, so it is not sandwiched
    const m = legalMoves(s).find((mv) => mv.to === P.point(2, 1))!;
    expect(m).toBeDefined();
    const after = applyMove(s, m);
    expect(after.board[P.point(2, 1)]).toBe(RAHU);
    expect(after.captured).toEqual([0, 0]);
  });

  it("findCaptures reports the closing stone", () => {
    const s = positionFromRows("grahan-6", [
      "......",
      "RSR...",
      "......",
      "......",
      "......",
      "......",
    ]);
    const b = findCaptures(s.board, s.plane, s.plane.point(2, 1), RAHU);
    expect(b.length).toBe(1);
    expect(b[0].anchor).toBe(s.plane.point(0, 1));
  });
});

describe("Superko", () => {
  it("forbids recreating an earlier position", () => {
    let s = positionFromRows("grahan-6", [
      "R.....",
      "......",
      "......",
      "......",
      "......",
      ".....S",
    ]);
    const P = s.plane;
    const find = (st: GameState, from: number, to: number) =>
      legalMoves(st).find((m) => m.from === from && m.to === to);
    s = applyMove(s, find(s, P.point(0, 0), P.point(1, 0))!);
    s = applyMove(s, find(s, P.point(5, 5), P.point(4, 5))!);
    s = applyMove(s, find(s, P.point(1, 0), P.point(0, 0))!);
    // Surya moving back would recreate starting position
    expect(find(s, P.point(4, 5), P.point(5, 5))).toBeUndefined();
  });
});

describe("Outcome", () => {
  it("reaching the capture target wins", () => {
    const s = positionFromRows("grahan-6", [
      "R.....",
      "S.....",
      "......",
      "......",
      "......",
      "......",
    ], RAHU, [4, 0]);
    expect(outcome(s).winner).toBeNull();
    const won = { ...s, captured: [5, 0] as const };
    expect(outcome(won).winner).toBe("rahu");
  });

  it("variant turn limits match expected ratios (maxTurns = maxPly / 2)", () => {
    expect(VARIANTS["grahan-6"].maxTurns).toBe(100);
    expect(VARIANTS["grahan-6"].maxPly).toBe(200);

    expect(VARIANTS["grahan-7"].maxTurns).toBe(125);
    expect(VARIANTS["grahan-7"].maxPly).toBe(250);

    expect(VARIANTS["grahan-8"].maxTurns).toBe(150);
    expect(VARIANTS["grahan-8"].maxPly).toBe(300);

    expect(VARIANTS["grahan-9"].maxTurns).toBe(175);
    expect(VARIANTS["grahan-9"].maxPly).toBe(350);

    expect(VARIANTS["grahan-10"].maxTurns).toBe(200);
    expect(VARIANTS["grahan-10"].maxPly).toBe(400);
  });

  it("turn counter increases after each completed turn (both players move)", () => {
    // Turn 1 start (0 moves made)
    expect(currentTurn(0)).toBe(1);
    expect(completedTurns(0)).toBe(0);

    // Rahu moves (ply 1) -> still Turn 1, Surya's move
    expect(currentTurn(1)).toBe(1);
    expect(completedTurns(1)).toBe(0);

    // Surya moves (ply 2) -> Turn 1 completed! Counter increases to Turn 2
    expect(currentTurn(2)).toBe(2);
    expect(completedTurns(2)).toBe(1);

    // Turn 2: Rahu moves (ply 3)
    expect(currentTurn(3)).toBe(2);
    expect(completedTurns(3)).toBe(1);

    // Surya moves (ply 4) -> Turn 2 completed! Counter increases to Turn 3
    expect(currentTurn(4)).toBe(3);
    expect(completedTurns(4)).toBe(2);

    // Capping at maxTurns
    expect(currentTurn(200, 100)).toBe(100);
  });
});

describe("AI", () => {
  it("selects legal moves", () => {
    const s = newGame("grahan-6");
    const r = chooseMove(s, { maxDepth: 2, timeMs: 300, noise: 0, random: seeded(42) });
    expect(r.move).not.toBeNull();
    const legal = legalMoves(s).some(
      (m: Move) => m.from === r.move!.from && m.to === r.move!.to && m.lineId === r.move!.lineId,
    );
    expect(legal).toBe(true);
  });

  it("three AI levels have distinct configurations for easy, medium, and hard", () => {
    expect(LEVELS[1].name).toBe("Easy");
    expect(LEVELS[1].maxDepth).toBe(1);
    expect(LEVELS[1].qDepth).toBe(0);
    expect(LEVELS[1].blunderRate).toBeGreaterThan(0.2);

    expect(LEVELS[2].name).toBe("Medium");
    expect(LEVELS[2].maxDepth).toBe(3);
    expect(LEVELS[2].qDepth).toBe(2);

    expect(LEVELS[3].name).toBe("Hard");
    expect(LEVELS[3].maxDepth).toBeGreaterThanOrEqual(12);
    expect(LEVELS[3].qDepth).toBe(4);
    expect(LEVELS[3].noise).toBe(0);
    expect(LEVELS[3].blunderRate).toBe(0);

    const s = newGame("grahan-6");
    const e = chooseMoveAtLevel(s, 1, seeded(10));
    const m = chooseMoveAtLevel(s, 2, seeded(10));
    const h = chooseMoveAtLevel(s, 3, seeded(10));
    expect(e.move).not.toBeNull();
    expect(m.move).not.toBeNull();
    expect(h.move).not.toBeNull();
  });

  it("HINT_OPTIONS uses deep search with zero noise to find tactical captures", () => {
    expect(HINT_OPTIONS.noise).toBe(0);
    expect(HINT_OPTIONS.blunderRate).toBe(0);
    expect(HINT_OPTIONS.maxDepth).toBeGreaterThanOrEqual(8);

    // Position where Rahu has a clear 1-move capture
    const s = positionFromRows("grahan-6", [
      "......",
      "R.SR..",
      "......",
      "......",
      "......",
      "......",
    ], RAHU);
    const P = s.plane;
    const r = chooseMove(s, HINT_OPTIONS);
    expect(r.move).not.toBeNull();
    // Hint should recommend closing the sandwich on S by sliding to (1, 1)
    expect(r.move!.to).toBe(P.point(1, 1));
  });

  it("simultaneous active capture and interposition capture resolves correctly", () => {
    // Column 1: Rahu at (1, 3), Surya at (1, 2). Moving to (1, 1) active-captures (1, 2).
    // Row 1: Surya at (0, 1) and (2, 1). Moving to (1, 1) sandwiches landing stone between two Surya stones.
    // Rahu slides diagonally from (3, 3) to (1, 1).
    const s = positionFromRows("grahan-6", [
      "......",
      "S.S...",
      ".S....",
      ".R.R..",
      "......",
      "......",
    ], RAHU);
    const P = s.plane;
    // Rahu at (3, 3) slides diagonally to (1, 1)
    const m = legalMoves(s).find((mv) => mv.from === P.point(3, 3) && mv.to === P.point(1, 1))!;
    expect(m).toBeDefined();
    const after = applyMove(s, m);

    // Active capture: Surya at (1, 2) is taken by Rahu -> captured[0] + 1
    // Interposition capture: Rahu at (1, 1) is taken by Surya -> captured[1] + 1
    expect(after.captured).toEqual([1, 1]);
    expect(after.board[P.point(1, 2)]).toBe(EMPTY);
    expect(after.board[P.point(1, 1)]).toBe(EMPTY);
  });
});
