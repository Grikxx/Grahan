import { describe, expect, it } from "vitest";
import {
  buildPlane,
  newGame, positionFromRows, legalMoves, pseudoMoves, applyMove, outcome, findCaptures,
  movePath, moveWraps, toSnapshot, fromSnapshot, threatenedStones,
  chooseMove, RAHU, SURYA, EMPTY, type GameState, type Move,
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

  it("moving between two enemies is safe", () => {
    const s = positionFromRows("grahan-6", [
      "......",
      "S..S..",
      ".R....",
      "......",
      "......",
      "......",
    ], RAHU);
    const P = s.plane;
    // Slide R from (1, 2) to (1, 1) or (2, 1) between the two S stones
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
});
