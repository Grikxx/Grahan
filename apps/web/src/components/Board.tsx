"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RAHU, pointName, type GameState, type Move } from "@grahan/engine";
import { drawScene, hitTest, makeView, slideDuration, ECLIPSE_MS, type SlideAnim, type View } from "@/lib/render";
import { playEclipse, playSlide } from "@/lib/sound";

export interface BoardProps {
  state: GameState;
  selected?: number | null;
  targets?: readonly Move[];
  danger?: ReadonlySet<number> | null;
  hint?: Move | null;
  marks?: readonly number[];
  interactive?: boolean;
  sound?: boolean;
  showLastMove?: boolean;
  label?: string;
  onCellClick?: (cell: number) => void;
  onEscape?: () => void;
  /** Called with true while a move animation is playing. */
  onAnimating?: (busy: boolean) => void;
}

export default function Board({
  state,
  selected = null,
  targets = [],
  danger = null,
  hint = null,
  marks = [],
  interactive = true,
  sound = false,
  showLastMove = true,
  label = "Game board",
  onCellClick,
  onEscape,
  onAnimating,
}: BoardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View | null>(null);
  const hoverRef = useRef<number | null>(null);
  const animRef = useRef<SlideAnim | null>(null);
  const prevRef = useRef<GameState | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);

  const live = useRef({ state, selected, targets, danger, hint, marks, cursor, showLastMove, interactive });
  const callbacks = useRef({ onAnimating, sound });

  useLayoutEffect(() => {
    live.current = { state, selected, targets, danger, hint, marks, cursor, showLastMove, interactive };
    callbacks.current = { onAnimating, sound };
  });

  const q = state.plane.q;

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (!prev || !state.lastMove || state.ply !== prev.ply + 1 || prev.plane.q !== state.plane.q) {
      animRef.current = null;
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move = state.lastMove;
    const mover = prev.turn;
    const slideMs = slideDuration(move.steps, reduced);
    animRef.current = {
      move,
      mover,
      start: performance.now(),
      slideMs,
      captured: [...state.lastCaptured],
      brackets: state.lastBrackets,
    };
    const n = state.lastCaptured.length;

    const { onAnimating: busy, sound: withSound } = callbacks.current;
    busy?.(true);
    if (withSound) playSlide();
    const timers: number[] = [];
    if (n > 0 && withSound) timers.push(window.setTimeout(() => playEclipse(n), slideMs));
    timers.push(
      window.setTimeout(() => {
        animRef.current = null;
        callbacks.current.onAnimating?.(false);
      }, slideMs + (n > 0 ? ECLIPSE_MS : 0)),
    );
    return () => {
      timers.forEach(clearTimeout);
      callbacks.current.onAnimating?.(false);
    };
  }, [state]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const size = Math.floor(wrap.clientWidth);
      if (size <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      viewRef.current = makeView(size, q);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [q]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const frame = (time: number) => {
      const v = viewRef.current;
      if (v) {
        const dpr = canvas.width / v.size;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const s = live.current;
        drawScene(ctx, v, {
          state: s.state,
          selected: s.selected,
          targets: s.targets,
          hover: s.interactive ? hoverRef.current : null,
          danger: s.danger,
          hint: s.hint,
          marks: s.marks,
          cursor: s.cursor,
          anim: animRef.current,
          showLastMove: s.showLastMove,
          time,
          reducedMotion: motion.matches,
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = viewRef.current;
    if (!v) return -1;
    const rect = e.currentTarget.getBoundingClientRect();
    return hitTest(v, state.plane, e.clientX - rect.left, e.clientY - rect.top);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || e.pointerType === "touch") return;
    const c = cellAt(e);
    hoverRef.current = c >= 0 ? c : null;
    e.currentTarget.style.cursor = c >= 0 ? "pointer" : "default";
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const c = cellAt(e);
    if (c >= 0) {
      setCursor(null);
      onCellClick?.(c);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const p = state.plane;
    const cur = cursor ?? selected ?? Math.floor(p.numPoints / 2);
    const x = p.x(cur), y = p.y(cur);
    const moveTo = (nx: number, ny: number) => {
      e.preventDefault();
      if (nx >= 0 && nx < q && ny >= 0 && ny < q) {
        const next = p.point(nx, ny);
        setCursor(next);
        hoverRef.current = next;
      }
    };
    switch (e.key) {
      case "ArrowLeft": return moveTo(x - 1, y);
      case "ArrowRight": return moveTo(x + 1, y);
      case "ArrowUp": return moveTo(x, y - 1);
      case "ArrowDown": return moveTo(x, y + 1);
      case "Enter":
      case " ":
        e.preventDefault();
        if (cursor === null) setCursor(cur);
        else onCellClick?.(cursor);
        return;
      case "Escape":
        onEscape?.();
        return;
    }
  };

  const whoseTurn = state.turn === RAHU ? "Rahu" : "Surya";
  const last = state.lastMove;
  const announce = last
    ? `${state.turn === RAHU ? "Surya" : "Rahu"} played ${pointName(state.plane, last.from)} to ${pointName(state.plane, last.to)}${
        state.lastCaptured.length ? ` and captured ${state.lastCaptured.length}` : ""
      }.`
    : "";

  return (
    <div ref={wrapRef} className="board-frame">
      <canvas
        ref={canvasRef}
        className="board-canvas"
        role="application"
        aria-label={`${label}. ${whoseTurn} to move. Use the arrow keys to move the cursor and Enter to select.`}
        tabIndex={interactive ? 0 : -1}
        onPointerMove={onPointerMove}
        onPointerLeave={() => (hoverRef.current = null)}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
      />
      <p className="sr-only" aria-live="polite">{announce}</p>
    </div>
  );
}
