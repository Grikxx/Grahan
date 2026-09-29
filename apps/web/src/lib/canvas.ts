/**
 * Game Canvas Rendering — Core Drawing Functions
 *
 * Renders the AG(2,q) board with:
 * - Grid points as pulsing stars
 * - Pieces as glowing orbs
 * - Line highlights with geometric hue coding
 * - Wrap-around arrows at canvas boundaries
 * - Capture shockwave animations
 */

// ─── Color Palette ──────────────────────────────────────────────────

export const COLORS = {
  bg: "#030308",
  gridDot: "rgba(100, 100, 140, 0.4)",
  gridDotHover: "rgba(167, 139, 250, 0.6)",
  gridLine: "rgba(60, 60, 90, 0.12)",

  pieceBlack: "#c4b5fd", // Violet
  pieceBlackGlow: "rgba(196, 181, 253, 0.3)",
  pieceBlackStroke: "rgba(196, 181, 253, 0.6)",

  pieceWhite: "#fbbf24", // Gold
  pieceWhiteGlow: "rgba(251, 191, 36, 0.3)",
  pieceWhiteStroke: "rgba(251, 191, 36, 0.6)",

  selected: "#f59e0b",
  selectedGlow: "rgba(245, 158, 11, 0.4)",

  moveTarget: "rgba(16, 185, 129, 0.5)",
  moveTargetRing: "rgba(16, 185, 129, 0.3)",

  captureFlash: "rgba(239, 68, 68, 0.8)",
};

// Line family hues (one color per parallel class / slope)
export const LINE_HUES = [
  "rgba(167, 139, 250, 0.25)", // violet
  "rgba(59, 130, 246, 0.25)",  // blue
  "rgba(6, 182, 212, 0.25)",   // cyan
  "rgba(16, 185, 129, 0.25)",  // emerald
  "rgba(245, 158, 11, 0.25)",  // amber
  "rgba(236, 72, 153, 0.25)",  // pink
];

export const LINE_HUES_BRIGHT = [
  "rgba(167, 139, 250, 0.7)",
  "rgba(59, 130, 246, 0.7)",
  "rgba(6, 182, 212, 0.7)",
  "rgba(16, 185, 129, 0.7)",
  "rgba(245, 158, 11, 0.7)",
  "rgba(236, 72, 153, 0.7)",
];

// ─── Coordinate Mapping ─────────────────────────────────────────

export interface BoardLayout {
  /** Canvas pixel size */
  size: number;
  /** Board order (q) */
  order: number;
  /** Padding from edges */
  padding: number;
  /** Spacing between grid points */
  spacing: number;
  /** Get pixel coordinates for a board point index */
  pointToPixel: (pointIndex: number) => [number, number];
  /** Get the nearest point index from pixel coordinates, or -1 */
  pixelToPoint: (px: number, py: number) => number;
}

export function createBoardLayout(canvasSize: number, order: number): BoardLayout {
  const padding = canvasSize * 0.12;
  const spacing = (canvasSize - 2 * padding) / (order - 1);

  return {
    size: canvasSize,
    order,
    padding,
    spacing,
    pointToPixel(pointIndex: number): [number, number] {
      const x = pointIndex % order;
      const y = Math.floor(pointIndex / order);
      return [padding + x * spacing, padding + y * spacing];
    },
    pixelToPoint(px: number, py: number): number {
      const hitRadius = spacing * 0.35;
      for (let yi = 0; yi < order; yi++) {
        for (let xi = 0; xi < order; xi++) {
          const gx = padding + xi * spacing;
          const gy = padding + yi * spacing;
          const dx = px - gx;
          const dy = py - gy;
          if (dx * dx + dy * dy < hitRadius * hitRadius) {
            return yi * order + xi;
          }
        }
      }
      return -1;
    },
  };
}

// ─── Drawing Functions ──────────────────────────────────────────

/**
 * Draws the background grid — subtle grid lines and point dots
 */
export function drawGrid(ctx: CanvasRenderingContext2D, layout: BoardLayout) {
  const { size, order, padding, spacing } = layout;

  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle grid lines
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;

  // Horizontal
  for (let y = 0; y < order; y++) {
    ctx.beginPath();
    ctx.moveTo(padding - spacing * 0.3, padding + y * spacing);
    ctx.lineTo(padding + (order - 1) * spacing + spacing * 0.3, padding + y * spacing);
    ctx.stroke();
  }

  // Vertical
  for (let x = 0; x < order; x++) {
    ctx.beginPath();
    ctx.moveTo(padding + x * spacing, padding - spacing * 0.3);
    ctx.lineTo(padding + x * spacing, padding + (order - 1) * spacing + spacing * 0.3);
    ctx.stroke();
  }

  // Grid points (stars)
  for (let i = 0; i < order * order; i++) {
    const [px, py] = layout.pointToPixel(i);
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gridDot;
    ctx.fill();
  }
}

/**
 * Draws a stone piece at the given point
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  pointIndex: number,
  color: 1 | 2, // 1=Black(violet), 2=White(gold)
  isSelected = false,
  time = 0,
) {
  const [px, py] = layout.pointToPixel(pointIndex);
  const radius = layout.spacing * 0.28;
  const pulse = Math.sin(time * 0.003) * 0.05 + 1;

  const fillColor = color === 1 ? COLORS.pieceBlack : COLORS.pieceWhite;
  const glowColor = color === 1 ? COLORS.pieceBlackGlow : COLORS.pieceWhiteGlow;
  const strokeColor = color === 1 ? COLORS.pieceBlackStroke : COLORS.pieceWhiteStroke;

  // Glow
  const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.5);
  gradient.addColorStop(0, isSelected ? COLORS.selectedGlow : glowColor);
  gradient.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(px, py, radius * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Main disc
  ctx.beginPath();
  ctx.arc(px, py, radius * pulse, 0, Math.PI * 2);
  ctx.fillStyle = isSelected ? COLORS.selected : fillColor;
  ctx.fill();
  ctx.strokeStyle = isSelected ? COLORS.selected : strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner highlight
  const highlight = ctx.createRadialGradient(
    px - radius * 0.3, py - radius * 0.3, 0,
    px, py, radius,
  );
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.25)");
  highlight.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(px, py, radius * pulse, 0, Math.PI * 2);
  ctx.fillStyle = highlight;
  ctx.fill();
}

/**
 * Highlights legal move targets
 */
export function drawMoveTargets(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  targets: number[],
  time: number,
) {
  for (const t of targets) {
    const [px, py] = layout.pointToPixel(t);
    const radius = layout.spacing * 0.15;
    const pulse = Math.sin(time * 0.004 + t) * 0.3 + 1;

    // Outer ring
    ctx.beginPath();
    ctx.arc(px, py, radius * 1.8 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.moveTargetRing;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.moveTarget;
    ctx.fill();
  }
}

/**
 * Draws highlighted geometric lines through a selected point.
 * Each parallel class gets a unique hue.
 */
export function drawLineHighlights(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  linePoints: number[][],
  slopeIndices: number[],
) {
  for (let i = 0; i < linePoints.length; i++) {
    const pts = linePoints[i];
    const hue = LINE_HUES_BRIGHT[slopeIndices[i] % LINE_HUES_BRIGHT.length];

    ctx.strokeStyle = hue;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    // Draw segments between consecutive points on the line
    for (let j = 0; j < pts.length; j++) {
      const [x1, y1] = layout.pointToPixel(pts[j]);
      const [x2, y2] = layout.pointToPixel(pts[(j + 1) % pts.length]);

      // Check if this is a wrap-around segment
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const maxDist = layout.spacing * 1.8;

      if (dx > maxDist || dy > maxDist) {
        // Wrap-around — draw arrows at edges
        drawWrapArrow(ctx, layout, x1, y1, x2, y2, hue);
      } else {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
  }
}

/**
 * Draws wrap-around indicator arrows when a line segment crosses the board edge
 */
function drawWrapArrow(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
) {
  const { padding, spacing, order } = layout;
  const edgeMin = padding - spacing * 0.5;
  const edgeMax = padding + (order - 1) * spacing + spacing * 0.5;

  // Draw from source to edge
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Normalize direction (accounting for wrap)
  const ndx = dx > 0 ? (dx > layout.spacing * 2 ? -1 : 1) : (dx < -layout.spacing * 2 ? 1 : -1);
  const ndy = dy > 0 ? (dy > layout.spacing * 2 ? -1 : 1) : (dy < -layout.spacing * 2 ? 1 : -1);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1.5;

  // Arrow from source toward edge
  const arrowLen = spacing * 0.4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ndx * arrowLen, y1 + ndy * arrowLen);
  ctx.stroke();

  // Small triangle at the end
  const tipX = x1 + ndx * arrowLen;
  const tipY = y1 + ndy * arrowLen;
  const aSize = 4;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ndx * aSize - ndy * aSize * 0.5, tipY - ndy * aSize + ndx * aSize * 0.5);
  ctx.lineTo(tipX - ndx * aSize + ndy * aSize * 0.5, tipY - ndy * aSize - ndx * aSize * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a capture animation (expanding ring shockwave)
 */
export function drawCaptureEffect(
  ctx: CanvasRenderingContext2D,
  layout: BoardLayout,
  pointIndex: number,
  progress: number, // 0..1
) {
  // Clamp progress to valid range
  progress = Math.max(0, Math.min(1, progress));

  const [px, py] = layout.pointToPixel(pointIndex);
  const maxRadius = layout.spacing * 1.2;
  const radius = Math.max(0, maxRadius * progress);
  const opacity = Math.max(0, 1 - progress);

  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(239, 68, 68, ${opacity * 0.8})`;
  ctx.lineWidth = Math.max(0.5, 3 * (1 - progress));
  ctx.stroke();

  // Inner flash
  if (progress < 0.3) {
    const innerR = Math.max(0, layout.spacing * 0.2 * (1 - progress * 3));
    ctx.beginPath();
    ctx.arc(px, py, innerR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 200, 200, ${Math.max(0, (1 - progress * 3) * 0.5)})`;
    ctx.fill();
  }
}

/**
 * Draws coordinate labels along the edges
 */
export function drawLabels(ctx: CanvasRenderingContext2D, layout: BoardLayout) {
  const { order, padding, spacing } = layout;

  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(100, 100, 140, 0.5)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // X labels (bottom)
  for (let x = 0; x < order; x++) {
    ctx.fillText(
      x.toString(),
      padding + x * spacing,
      padding + (order - 1) * spacing + spacing * 0.45,
    );
  }

  // Y labels (left)
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let y = 0; y < order; y++) {
    ctx.fillText(
      y.toString(),
      padding - spacing * 0.45,
      padding + y * spacing,
    );
  }
}
