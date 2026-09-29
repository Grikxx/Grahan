/**
 * @grahan/engine — Custodial Capture Resolution
 *
 * Implements the "Eclipse" capture mechanic:
 * When a stone lands on point P, for each line through P, walk outward
 * in both directions. If the immediate neighbor is an enemy, continue
 * walking through consecutive enemies. If the run terminates with a
 * friendly stone (not P itself), all enemies in the run are captured.
 *
 * Key rules:
 * - Only the LANDING move triggers captures (Seega safety rule).
 * - A single stone cannot bracket cyclically against itself.
 * - Multi-line captures are resolved simultaneously.
 */

import type { IncidenceStructure } from '@grahan/math';
import { CellState, type Player, type CaptureResult } from './types.js';

/**
 * Resolves all custodial captures triggered by player `mover` landing
 * on point `landingPoint`.
 *
 * Returns the set of all captured point indices, grouped by line.
 */
export function resolveCustodialCapture(
  board: Uint8Array,
  landingPoint: number,
  mover: Player,
  plane: IncidenceStructure,
): CaptureResult {
  const enemy = mover === CellState.Black ? CellState.White : CellState.Black;
  const q = plane.order;
  const allCaptured: number[] = [];
  const capturesPerLine = new Map<number, number[]>();
  const capturedSet = new Set<number>();

  const [lx, ly] = [landingPoint % q, Math.floor(landingPoint / q)];
  const lines = plane.linesThrough(landingPoint);

  for (const lineId of lines) {
    const pts = plane.linePoints(lineId);
    const myIdx = pts.indexOf(landingPoint);

    // Check both directions along the line
    for (const dir of [1, -1] as const) {
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

      // Walk outward along the line segment within grid bounds
      for (let step = 1; step < q; step++) {
        cx += dx;
        cy += dy;
        if (cx < 0 || cx >= q || cy < 0 || cy >= q) break;

        const checkPt = cy * q + cx;

        if (board[checkPt] === enemy) {
          run.push(checkPt);
        } else if (board[checkPt] === mover) {
          // Found a friendly bracket — capture the entire enemy run
          if (checkPt !== landingPoint && run.length > 0) {
            for (const cap of run) {
              if (!capturedSet.has(cap)) {
                capturedSet.add(cap);
                allCaptured.push(cap);
              }
            }
            if (!capturesPerLine.has(lineId)) {
              capturesPerLine.set(lineId, []);
            }
            capturesPerLine.get(lineId)!.push(...run);
          }
          break;
        } else {
          // Empty cell — no bracket possible in this direction
          break;
        }
      }
    }
  }

  return { captured: allCaptured, capturesPerLine };
}
