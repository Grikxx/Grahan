/**
 * Board renderer.
 *
 * Renders the Grahan board with astrolabe brass styling, glowing celestial stones
 * (Rahu - shadow moon, Surya - radiant sun), straight line/diagonal guides,
 * move animations, and eclipse capture visuals.
 */

import {
  EMPTY, RAHU, SURYA, findCaptures, movePath,
  type Bracket, type GameState, type Move, type Plane, type Player,
} from "@grahan/engine";

export const COLORS = {
  plate: "#0E0B22",
  plateLight: "#1B1640",
  brass: "#D8B46A",
  brassDim: "#8A7346",
  moon: "#B9C8F5",
  sun: "#F6B93B",
  sindoor: "#E4573D",
  parchment: "#EEE6D3",
};

/** One color per line slope class (horizontal, vertical, diagonal, anti-diagonal). */
export const LINE_COLORS = ["#E8C77A", "#8FB3FF", "#6FD3C1", "#F08FA8"];

const MARGIN = 0.85;
export const ECLIPSE_MS = 950;

export interface View {
  size: number;
  q: number;
  cell: number;
  off: number;
}

export function makeView(size: number, q: number): View {
  const cell = size / (q - 1 + 2 * MARGIN);
  return { size, q, cell, off: MARGIN * cell };
}

export const px = (v: View, x: number) => v.off + x * v.cell;

/** Point under a canvas position, or -1 if outside. */
export function hitTest(v: View, plane: Plane, x: number, y: number): number {
  const fx = (x - v.off) / v.cell;
  const fy = (y - v.off) / v.cell;
  const rx = Math.round(fx);
  const ry = Math.round(fy);
  if ((fx - rx) ** 2 + (fy - ry) ** 2 > 0.45 * 0.45) return -1;
  if (rx < 0 || ry < 0 || rx >= v.q || ry >= v.q) return -1;
  return plane.point(rx, ry);
}

// ─── Scene ──────────────────────────────────────────────────────────

export interface SlideAnim {
  move: Move;
  mover: Player;
  start: number;
  slideMs: number;
  captured: number[];
  brackets: readonly Bracket[];
}

export interface Scene {
  state: GameState;
  selected: number | null;
  targets: readonly Move[];
  hover: number | null;
  danger: ReadonlySet<number> | null;
  hint: Move | null;
  marks: readonly number[];
  cursor: number | null;
  anim: SlideAnim | null;
  showLastMove: boolean;
  time: number;
  reducedMotion: boolean;
}

export function slideDuration(steps: number, reducedMotion: boolean) {
  return reducedMotion ? 0 : Math.min(560, 160 + steps * 90);
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function drawScene(ctx: CanvasRenderingContext2D, v: View, sc: Scene) {
  const { state } = sc;
  const plane = state.plane;
  const r = v.cell * 0.32;

  drawBackdrop(ctx, v);

  // Lattice points
  for (let y = 0; y < v.q; y++) {
    for (let x = 0; x < v.q; x++) {
      ctx.fillStyle = COLORS.brassDim;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(px(v, x), px(v, y), Math.max(2, v.cell * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  for (const m of sc.marks) drawMark(ctx, v, plane, m, sc.time);

  // Line highlights for selected stone
  if (sc.selected !== null) drawLinesThrough(ctx, v, plane, sc.selected);

  // Last move trail
  if (sc.showLastMove && state.lastMove && !sc.anim) {
    drawTrail(ctx, v, plane, state.lastMove, "rgba(216,180,106,0.35)", 2);
    const fx = plane.x(state.lastMove.from), fy = plane.y(state.lastMove.from);
    ctx.strokeStyle = COLORS.brassDim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px(v, fx), px(v, fy), r * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Move targets
  const pulse = sc.reducedMotion ? 1 : 1 + 0.1 * Math.sin(sc.time * 0.005);
  const targetCells = new Set(sc.targets.map((m) => m.to));
  for (const t of targetCells) {
    const tx = px(v, plane.x(t)), ty = px(v, plane.y(t));
    ctx.strokeStyle = COLORS.brass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, r * 0.55 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(216,180,106,0.2)";
    ctx.fill();
  }

  // Hint
  if (sc.hint && !sc.anim) {
    drawTrail(ctx, v, plane, sc.hint, "rgba(143,179,255,0.75)", 2.5);
    const hx = px(v, plane.x(sc.hint.to)), hy = px(v, plane.y(sc.hint.to));
    ctx.strokeStyle = LINE_COLORS[1];
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(hx, hy, r * 1.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Hover preview: trail, ghost piece, capture brackets
  let preview: { move: Move; brackets: Bracket[] } | null = null;
  if (sc.hover !== null && sc.selected !== null) {
    const m = sc.targets.find((t) => t.to === sc.hover);
    if (m) {
      const b = new Uint8Array(state.board);
      b[m.from] = EMPTY;
      b[m.to] = state.turn;
      preview = { move: m, brackets: findCaptures(b, plane, m.to, state.turn) };
      drawTrail(ctx, v, plane, m, "rgba(238,230,211,0.6)", 2);
    }
  }

  // Stones
  const anim = sc.anim;
  const elapsed = anim ? sc.time - anim.start : 0;
  const sliding = anim !== null && elapsed < anim.slideMs;

  for (let p = 0; p < plane.numPoints; p++) {
    const c = state.board[p];
    if (c === EMPTY) continue;
    if (sliding && p === anim!.move.to) continue;
    const isSel = p === sc.selected;
    const cx = px(v, plane.x(p)), cy = px(v, plane.y(p));
    drawStone(ctx, cx, cy, r, c as Player, 1, sc.time, sc.reducedMotion);
    if (isSel) drawSelection(ctx, cx, cy, r, sc.time, sc.reducedMotion);
    if (sc.danger?.has(p)) drawDanger(ctx, cx, cy, r, sc.time, sc.reducedMotion);
  }

  // Ghost stone at hovered destination
  if (preview) {
    const t = preview.move.to;
    const tx = px(v, plane.x(t)), ty = px(v, plane.y(t));
    drawStone(ctx, tx, ty, r, state.turn, 0.45, sc.time, true);
    let n = 0;
    for (const b of preview.brackets) {
      drawBeam(ctx, v, plane, t, b.anchor, state.turn, 0.5, true);
      for (const cell of b.cells) {
        n++;
        const bx = px(v, plane.x(cell)), by = px(v, plane.y(cell));
        ctx.strokeStyle = COLORS.sindoor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bx, by, r * 1.15, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (n > 0) {
      const label = `×${n}`;
      ctx.font = `600 ${Math.round(v.cell * 0.22)}px "Hanken Grotesk", system-ui, sans-serif`;
      const w = ctx.measureText(label).width + 12;
      const h = v.cell * 0.26;
      const bx = tx + r * 0.7, by = ty - r * 1.5;
      ctx.fillStyle = COLORS.sindoor;
      roundRect(ctx, bx, by, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + w / 2, by + h / 2 + 1);
    }
  }

  // Slide animation and eclipse capture animations
  if (anim) {
    const { move, mover } = anim;
    const fx = plane.x(move.from), fy = plane.y(move.from);
    const tx = plane.x(move.to), ty = plane.y(move.to);

    if (sliding) {
      const t = ease(anim.slideMs === 0 ? 1 : elapsed / anim.slideMs);
      const ux = fx + (tx - fx) * t;
      const uy = fy + (ty - fy) * t;
      drawStone(ctx, px(v, ux), px(v, uy), r, mover, 1, sc.time, sc.reducedMotion);
    }

    const e = sliding ? -1 : (elapsed - anim.slideMs) / ECLIPSE_MS;
    const victim: Player = mover === RAHU ? SURYA : RAHU;

    for (const cell of anim.captured) {
      const cx = px(v, plane.x(cell)), cy = px(v, plane.y(cell));
      if (e < 0) {
        drawStone(ctx, cx, cy, r, victim, 1, sc.time, sc.reducedMotion);
      } else if (e < 1) {
        const ang = Math.atan2(plane.y(cell) - ty, plane.x(cell) - tx);
        drawEclipse(ctx, cx, cy, r, victim, e, ang, sc.time, sc.reducedMotion);
      }
    }
    if (e >= 0 && e < 0.65) {
      for (const b of anim.brackets) {
        drawBeam(ctx, v, plane, move.to, b.anchor, mover, 1 - e / 0.65, false);
      }
    }
  }

  // Keyboard navigation focus cursor
  if (sc.cursor !== null) {
    const cx = px(v, plane.x(sc.cursor)), cy = px(v, plane.y(sc.cursor));
    const s = v.cell * 0.46;
    ctx.strokeStyle = COLORS.parchment;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    roundRect(ctx, cx - s, cy - s, s * 2, s * 2, 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ─── Backdrop ───────────────────────────────────────────────────────

function drawBackdrop(ctx: CanvasRenderingContext2D, v: View) {
  const { size, q } = v;
  const c = px(v, (q - 1) / 2);
  const g = ctx.createRadialGradient(c, c, 0, c, c, size * 0.75);
  g.addColorStop(0, COLORS.plateLight);
  g.addColorStop(1, COLORS.plate);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Faint astrolabe rings
  ctx.strokeStyle = "rgba(216,180,106,0.08)";
  ctx.lineWidth = 1;
  for (let k = 1; k <= 4; k++) {
    ctx.beginPath();
    ctx.arc(c, c, (size / 2) * (k / 4) * 0.96, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const r0 = size * 0.46, r1 = size * (k % 2 === 0 ? 0.485 : 0.475);
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    ctx.stroke();
  }

  // Outer brass frame
  const lo = px(v, -0.5), hi = px(v, q - 0.5);
  ctx.strokeStyle = COLORS.brass;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1.8;
  ctx.strokeRect(lo, lo, hi - lo, hi - lo);
  ctx.globalAlpha = 0.25;
  ctx.strokeRect(lo - 4, lo - 4, hi - lo + 8, hi - lo + 8);
  ctx.globalAlpha = 1;

  // Grid coordinates along the frame
  const fs = Math.max(9, Math.round(v.cell * 0.18));
  ctx.font = `500 ${fs}px "Hanken Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < q; i++) {
    const t = px(v, i);
    // Columns (a, b, c...) at top
    ctx.fillStyle = COLORS.brass;
    ctx.fillText(String.fromCharCode(97 + i), t, lo - fs);
    // Rows (1, 2, 3...) at left
    ctx.fillText(String(i + 1), lo - fs, t);
  }
}

// ─── Lines, trails, beams ───────────────────────────────────────────

function drawLinesThrough(ctx: CanvasRenderingContext2D, v: View, plane: Plane, p: number) {
  ctx.lineCap = "round";
  for (const l of plane.linesThrough[p]) {
    const pts = plane.lines[l];
    if (pts.length < 2) continue;
    const color = LINE_COLORS[plane.slope[l] % LINE_COLORS.length];
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);

    ctx.beginPath();
    const p0 = pts[0];
    ctx.moveTo(px(v, plane.x(p0)), px(v, plane.y(p0)));
    for (let i = 1; i < pts.length; i++) {
      const pi = pts[i];
      ctx.lineTo(px(v, plane.x(pi)), px(v, plane.y(pi)));
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawTrail(ctx: CanvasRenderingContext2D, v: View, plane: Plane, m: Move, color: string, width: number) {
  const fx = px(v, plane.x(m.from)), fy = px(v, plane.y(m.from));
  const tx = px(v, plane.x(m.to)), ty = px(v, plane.y(m.to));

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([4, 5]);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const c of movePath(plane, m).slice(0, -1)) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px(v, plane.x(c)), px(v, plane.y(c)), width + 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBeam(
  ctx: CanvasRenderingContext2D, v: View, plane: Plane,
  a: number, b: number, mover: Player, alpha: number, dashed: boolean,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = mover === RAHU ? COLORS.moon : COLORS.sun;
  ctx.lineWidth = dashed ? 2 : 4;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = dashed ? 0 : 14;
  if (dashed) ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(px(v, plane.x(a)), px(v, plane.y(a)));
  ctx.lineTo(px(v, plane.x(b)), px(v, plane.y(b)));
  ctx.stroke();
  ctx.restore();
}

function drawMark(ctx: CanvasRenderingContext2D, v: View, plane: Plane, p: number, time: number) {
  const cx = px(v, plane.x(p)), cy = px(v, plane.y(p));
  const r = v.cell * 0.22 * (1 + 0.08 * Math.sin(time * 0.004));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(216,180,106,0.85)";
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── Stones ─────────────────────────────────────────────────────────

export function drawStone(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  who: Player, alpha: number, time: number, still: boolean,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (who === RAHU) {
    // Rahu: dark moon with silver rim, glint, and celestial glow
    const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.7);
    glow.addColorStop(0, "rgba(185,200,245,0.28)");
    glow.addColorStop(1, "rgba(185,200,245,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    body.addColorStop(0, "#2E2768");
    body.addColorStop(1, "#090718");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.moon;
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.stroke();

    ctx.strokeStyle = "rgba(230,236,255,0.55)";
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, Math.PI * 0.95, Math.PI * 1.45);
    ctx.stroke();

    const ga = Math.PI * 1.75 + (still ? 0 : Math.sin(time * 0.0015) * 0.15);
    ctx.fillStyle = "#F4F7FF";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ga) * r, cy + Math.sin(ga) * r, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Surya: gold sun disc with rotating rays
    const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.9);
    glow.addColorStop(0, "rgba(246,185,59,0.35)");
    glow.addColorStop(1, "rgba(246,185,59,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    const spin = still ? 0 : time * 0.00025;
    ctx.fillStyle = "#F2A93B";
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = spin + (i / 12) * Math.PI * 2;
      const a1 = a - 0.13, a2 = a + 0.13;
      ctx.moveTo(cx + Math.cos(a1) * r * 0.95, cy + Math.sin(a1) * r * 0.95);
      ctx.lineTo(cx + Math.cos(a) * r * 1.32, cy + Math.sin(a) * r * 1.32);
      ctx.lineTo(cx + Math.cos(a2) * r * 0.95, cy + Math.sin(a2) * r * 0.95);
    }
    ctx.fill();

    const body = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.05, cx, cy, r);
    body.addColorStop(0, "#FFF2C4");
    body.addColorStop(0.55, COLORS.sun);
    body.addColorStop(1, "#D07A22");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSelection(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number, still: boolean) {
  ctx.save();
  ctx.strokeStyle = COLORS.parchment;
  ctx.lineWidth = 2;
  ctx.setLineDash([r * 0.35, r * 0.25]);
  ctx.lineDashOffset = still ? 0 : -time * 0.02;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDanger(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number, still: boolean) {
  const a = still ? 0.8 : 0.55 + 0.35 * Math.sin(time * 0.006);
  ctx.save();
  ctx.strokeStyle = COLORS.sindoor;
  ctx.globalAlpha = a;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Capture animation, e in [0, 1].
 */
function drawEclipse(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  victim: Player, e: number, angle: number, time: number, still: boolean,
) {
  const fade = e < 0.7 ? 1 : 1 - (e - 0.7) / 0.3;
  if (still) {
    drawStone(ctx, cx, cy, r, victim, fade, time, true);
    return;
  }
  ctx.save();
  if (victim === SURYA) {
    drawStone(ctx, cx, cy, r, SURYA, fade, time, false);
    const k = Math.min(1, e / 0.45);
    const off = (1 - ease(k)) * r * 2.1;
    const sx = cx - Math.cos(angle) * off, sy = cy - Math.sin(angle) * off;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#07051A";
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.98, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (e > 0.42) {
      const c = Math.min(1, (e - 0.42) / 0.5);
      ctx.globalAlpha = (1 - c) * 0.95;
      ctx.strokeStyle = "#FFF6DA";
      ctx.shadowColor = "#FFE7A3";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r * (1 + c * 0.9), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, r * 0.16 * (1 - c), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    drawStone(ctx, cx, cy, r, RAHU, fade, time, false);
    const k = Math.min(1, e / 0.5);
    ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.2);
    g.addColorStop(0, "rgba(255,246,218,1)");
    g.addColorStop(0.6, "rgba(246,185,59,0.9)");
    g.addColorStop(1, "rgba(246,185,59,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.2 * ease(k), 0, Math.PI * 2);
    ctx.fill();
    if (e > 0.4) {
      const c = Math.min(1, (e - 0.4) / 0.5);
      ctx.globalAlpha = (1 - c) * 0.9;
      ctx.strokeStyle = COLORS.sun;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + angle;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * (1 + c * 0.4), cy + Math.sin(a) * r * (1 + c * 0.4));
        ctx.lineTo(cx + Math.cos(a) * r * (1.3 + c), cy + Math.sin(a) * r * (1.3 + c));
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
