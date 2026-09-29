/**
 * @grahan/math — Affine Plane AG(2, q) Incidence Structure
 *
 * Builds the complete incidence geometry for AG(2, q) over a Galois Field.
 * The plane has q² points arranged on a q×q grid with toroidal topology.
 *
 * Lines are organized into (q + 1) parallel classes:
 *   - q classes of finite slope m ∈ GF(q): lines y = mx + b
 *   - 1 class of vertical lines (slope ∞): lines x = a
 *
 * Each parallel class contains exactly q lines that partition all q² points.
 */

import type { Field } from './field.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IncidenceStructure {
  /** Order of the affine plane */
  readonly order: number;

  /** Total number of points: q² */
  readonly numPoints: number;

  /** Total number of lines: q(q + 1) */
  readonly numLines: number;

  /** Number of parallel classes: q + 1 */
  readonly numParallelClasses: number;

  /**
   * Returns the point index for coordinates (x, y).
   * Index = y * q + x
   */
  pointIndex(x: number, y: number): number;

  /**
   * Returns [x, y] coordinates for a point index.
   */
  pointCoords(index: number): [number, number];

  /**
   * Returns the cyclic array of point indices on line `lineId`.
   * The array is ordered along the parametric direction of the line.
   * Length is exactly q.
   */
  linePoints(lineId: number): readonly number[];

  /**
   * Returns the (q + 1) line IDs passing through point `pointId`.
   */
  linesThrough(pointId: number): readonly number[];

  /**
   * Returns the unique line ID connecting two distinct points p1 and p2.
   * Throws if p1 === p2.
   */
  lineThrough(p1: number, p2: number): number;

  /**
   * Returns all distinct points adjacent to `pointId` across all lines.
   * A point is adjacent if it is one step away on any line through pointId.
   * Returns exactly 2(q+1) neighbors (since each of q+1 lines contributes
   * exactly 2 neighbors: one in each direction along the cycle).
   *
   * Note: For q ≤ 3, some neighbors may repeat across lines, but the
   * specification states 2(q+1) due to vertex-transitivity in general.
   * We return all unique neighbors.
   */
  neighbors(pointId: number): readonly number[];

  /**
   * Returns the parallel class index (slope index) for a given line.
   * Slopes 0..q-1 correspond to finite slopes; slope q is vertical (∞).
   */
  lineSlope(lineId: number): number;

  /**
   * Returns all q line IDs in a given parallel class.
   */
  parallelClass(slopeIndex: number): readonly number[];

  /**
   * Returns the underlying field used for this plane.
   */
  readonly field: Field;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Builds the incidence structure for AG(2, q) over the given field.
 *
 * Line storage:
 *   - Lines 0..(q²-1): Finite slope lines. For slope index m (0..q-1) and
 *     intercept index b (0..q-1), lineId = m * q + b.
 *     Line equation: y = field.elements()[m] * x + field.elements()[b]
 *   - Lines q²..(q²+q-1): Vertical lines. For x-intercept a (0..q-1),
 *     lineId = q² + a. Line equation: x = field.elements()[a]
 */
export function buildAffinePlane(field: Field): IncidenceStructure {
  const q = field.order;
  const numPoints = q * q;
  const numLines = q * (q + 1);
  const numParallelClasses = q + 1;
  const elems = field.elements();

  // ── Precompute all line-point associations ──

  // linePointsMap[lineId] = cyclic array of point indices on this line
  const linePointsMap: number[][] = new Array(numLines);

  // linesOfPoint[pointId] = array of line IDs through this point
  const linesOfPoint: number[][] = new Array(numPoints);
  for (let i = 0; i < numPoints; i++) {
    linesOfPoint[i] = [];
  }

  // parallelClassMap[slopeIndex] = array of line IDs in this class
  const parallelClassMap: number[][] = new Array(numParallelClasses);

  // ── Finite slope lines: y = m*x + b ──
  for (let mi = 0; mi < q; mi++) {
    const m = elems[mi]; // slope value in GF(q)
    const classLines: number[] = [];

    for (let bi = 0; bi < q; bi++) {
      const b = elems[bi]; // intercept value in GF(q)
      const lineId = mi * q + bi;
      classLines.push(lineId);

      // Parametrize: for each x in GF(q), compute y = m*x + b
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

    parallelClassMap[mi] = classLines;
  }

  // ── Vertical lines: x = a ──
  const verticalClassLines: number[] = [];
  for (let ai = 0; ai < q; ai++) {
    const a = elems[ai]; // x-value
    const lineId = q * q + ai;
    verticalClassLines.push(lineId);

    // All points (a, y) for y in GF(q)
    const points: number[] = new Array(q);
    for (let yi = 0; yi < q; yi++) {
      const y = elems[yi];
      const pid = y * q + a;
      points[yi] = pid;
      linesOfPoint[pid].push(lineId);
    }
    linePointsMap[lineId] = points;
  }
  parallelClassMap[q] = verticalClassLines;

  // ── Precompute line-through lookup: pairToLine[p1 * numPoints + p2] = lineId ──
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

  // ── Precompute neighbor sets ──
  const neighborsMap: number[][] = new Array(numPoints);
  for (let pid = 0; pid < numPoints; pid++) {
    const neighborSet = new Set<number>();
    for (const lid of linesOfPoint[pid]) {
      const pts = linePointsMap[lid];
      const idx = pts.indexOf(pid);
      // Two neighbors on the cycle: one step forward, one step backward
      const next = pts[(idx + 1) % q];
      const prev = pts[(idx - 1 + q) % q];
      neighborSet.add(next);
      neighborSet.add(prev);
    }
    neighborsMap[pid] = Array.from(neighborSet);
  }

  // ── Freeze all arrays for immutability ──
  for (let i = 0; i < numLines; i++) Object.freeze(linePointsMap[i]);
  for (let i = 0; i < numPoints; i++) {
    Object.freeze(linesOfPoint[i]);
    Object.freeze(neighborsMap[i]);
  }
  for (let i = 0; i < numParallelClasses; i++) Object.freeze(parallelClassMap[i]);

  return {
    order: q,
    numPoints,
    numLines,
    numParallelClasses,
    field,

    pointIndex(x: number, y: number): number {
      return y * q + x;
    },

    pointCoords(index: number): [number, number] {
      return [index % q, Math.floor(index / q)];
    },

    linePoints(lineId: number): readonly number[] {
      return linePointsMap[lineId];
    },

    linesThrough(pointId: number): readonly number[] {
      return linesOfPoint[pointId];
    },

    lineThrough(p1: number, p2: number): number {
      if (p1 === p2) throw new Error('lineThrough requires two distinct points');
      const lid = pairToLine[p1 * numPoints + p2];
      if (lid === -1) throw new Error(`No line found through points ${p1} and ${p2}`);
      return lid;
    },

    neighbors(pointId: number): readonly number[] {
      return neighborsMap[pointId];
    },

    lineSlope(lineId: number): number {
      if (lineId >= q * q) return q; // vertical
      return Math.floor(lineId / q);
    },

    parallelClass(slopeIndex: number): readonly number[] {
      return parallelClassMap[slopeIndex];
    },
  };
}
