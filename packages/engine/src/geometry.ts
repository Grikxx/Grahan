/**
 * Geometry of the GRAHAN board.
 *
 * Board sizes: 6×6, 7×7, 8×8, 9×9, 10×10 (and any q >= 3).
 * Movement is strictly bounded by the grid edges (no toroidal wrapping).
 * Pieces slide along straight lines:
 *   - Horizontal (row)
 *   - Vertical (column)
 *   - Diagonals (slope +1 and slope -1)
 *
 * Captures are custodial (sandwiches) along straight lines and diagonals
 * within the grid.
 */

export interface CaptureRay {
  /** Line this ray belongs to. */
  readonly lineId: number;
  /** Points walked outward from the origin, in order, inside the square. */
  readonly cells: readonly number[];
}

export interface Plane {
  readonly q: number;
  readonly numPoints: number;
  readonly numLines: number;
  /** Points of each line in order. */
  readonly lines: readonly (readonly number[])[];
  /** Lines through each point. */
  readonly linesThrough: readonly (readonly number[])[];
  /** Slope class of each line: 0=horizontal, 1=vertical, 2=diagonal, 3=anti-diagonal. */
  readonly slope: readonly number[];
  /** Smallest lattice step vector [dx, dy] along each line. */
  readonly vec: readonly (readonly [number, number])[];
  /** indexOnLine[lineId * numPoints + point] = position of point on the line, or -1. */
  readonly indexOnLine: Int8Array;
  /** Straight rays out of each point (up to 8 rays per point). */
  readonly captureRays: readonly (readonly CaptureRay[])[];
  x(p: number): number;
  y(p: number): number;
  point(x: number, y: number): number;
  /** The line through two collinear points, or -1 if none. */
  lineThrough(a: number, b: number): number;
}

const planeCache = new Map<number, Plane>();

/** Builds (and caches) the straight-line grid geometry for board size q. */
export function buildPlane(q: number): Plane {
  const cached = planeCache.get(q);
  if (cached) return cached;

  const numPoints = q * q;
  const point = (x: number, y: number) => y * q + x;

  const lines: number[][] = [];
  const slope: number[] = [];
  const vec: [number, number][] = [];
  const linesThrough: number[][] = Array.from({ length: numPoints }, () => []);

  // 1. Horizontal lines: y = 0..q-1
  for (let y = 0; y < q; y++) {
    const id = lines.length;
    const pts: number[] = [];
    for (let x = 0; x < q; x++) {
      const p = point(x, y);
      pts.push(p);
      linesThrough[p].push(id);
    }
    lines.push(pts);
    slope.push(0);
    vec.push([1, 0]);
  }

  // 2. Vertical lines: x = 0..q-1
  for (let x = 0; x < q; x++) {
    const id = lines.length;
    const pts: number[] = [];
    for (let y = 0; y < q; y++) {
      const p = point(x, y);
      pts.push(p);
      linesThrough[p].push(id);
    }
    lines.push(pts);
    slope.push(1);
    vec.push([0, 1]);
  }

  // 3. Diagonals (slope +1): y - x = d, d in [-(q-2) .. (q-2)] (lines with at least 2 points)
  for (let d = -(q - 2); d <= q - 2; d++) {
    const id = lines.length;
    const pts: number[] = [];
    for (let x = 0; x < q; x++) {
      const y = x + d;
      if (y >= 0 && y < q) {
        const p = point(x, y);
        pts.push(p);
        linesThrough[p].push(id);
      }
    }
    if (pts.length >= 2) {
      lines.push(pts);
      slope.push(2);
      vec.push([1, 1]);
    }
  }

  // 4. Anti-diagonals (slope -1): y + x = s, s in [1 .. 2q-3] (lines with at least 2 points)
  for (let s = 1; s <= 2 * q - 3; s++) {
    const id = lines.length;
    const pts: number[] = [];
    for (let x = 0; x < q; x++) {
      const y = s - x;
      if (y >= 0 && y < q) {
        const p = point(x, y);
        pts.push(p);
        linesThrough[p].push(id);
      }
    }
    if (pts.length >= 2) {
      lines.push(pts);
      slope.push(3);
      vec.push([1, -1]);
    }
  }

  const numLines = lines.length;
  const indexOnLine = new Int8Array(numLines * numPoints).fill(-1);
  const pairLine = new Int16Array(numPoints * numPoints).fill(-1);

  for (let l = 0; l < numLines; l++) {
    const pts = lines[l];
    for (let i = 0; i < pts.length; i++) {
      indexOnLine[l * numPoints + pts[i]] = i;
      for (let j = 0; j < pts.length; j++) {
        if (i !== j) pairLine[pts[i] * numPoints + pts[j]] = l;
      }
    }
  }

  // Precompute straight non-wrapping capture rays out of each point
  const captureRays: CaptureRay[][] = [];
  for (let p = 0; p < numPoints; p++) {
    const px = p % q;
    const py = Math.floor(p / q);
    const rays: CaptureRay[] = [];
    for (const l of linesThrough[p]) {
      const [dx, dy] = vec[l];
      for (const dir of [1, -1]) {
        const cells: number[] = [];
        let cx = px + dx * dir;
        let cy = py + dy * dir;
        while (cx >= 0 && cx < q && cy >= 0 && cy < q) {
          cells.push(point(cx, cy));
          cx += dx * dir;
          cy += dy * dir;
        }
        if (cells.length > 0) rays.push({ lineId: l, cells });
      }
    }
    captureRays.push(rays);
  }

  const plane: Plane = {
    q,
    numPoints,
    numLines,
    lines,
    linesThrough,
    slope,
    vec,
    indexOnLine,
    captureRays,
    x: (p) => p % q,
    y: (p) => Math.floor(p / q),
    point,
    lineThrough: (a, b) => {
      if (a === b) throw new Error("A single point does not define a line");
      return pairLine[a * numPoints + b];
    },
  };

  planeCache.set(q, plane);
  return plane;
}
