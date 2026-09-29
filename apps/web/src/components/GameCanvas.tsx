"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState, Move } from "@/lib/engine";
import { CellState } from "@/lib/engine";
import {
  createBoardLayout,
  drawGrid,
  drawPiece,
  drawMoveTargets,
  drawLineHighlights,
  drawLabels,
  drawCaptureEffect,
  type BoardLayout,
} from "@/lib/canvas";

interface GameCanvasProps {
  gameState: GameState;
  selectedPoint: number | null;
  availableMoves: Move[];
  captureAnimations: number[];
  onPointClick: (point: number) => void;
  onClearAnimations: () => void;
  className?: string;
}

export default function GameCanvas({
  gameState,
  selectedPoint,
  availableMoves,
  captureAnimations,
  onPointClick,
  onClearAnimations,
  className = "",
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<BoardLayout | null>(null);
  const animRef = useRef<number>(0);
  const captureStartRef = useRef<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const order = gameState.plane.order;

  // ── Setup Layout ─────────────────────────────────────────────

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    layoutRef.current = createBoardLayout(size, order);
  }, [order]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [setupCanvas]);

  // ── Capture Animation ────────────────────────────────────────

  useEffect(() => {
    if (captureAnimations.length > 0) {
      captureStartRef.current = performance.now();
      const timeout = setTimeout(onClearAnimations, 600);
      return () => clearTimeout(timeout);
    }
  }, [captureAnimations, onClearAnimations]);

  // ── Animation Loop ───────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let running = true;

    function render(time: number) {
      if (!running) return;
      const ctx = canvas!.getContext("2d");
      const layout = layoutRef.current;
      if (!ctx || !layout) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      ctx.save();

      // Clear & draw grid
      drawGrid(ctx, layout);
      drawLabels(ctx, layout);

      // Draw line highlights for selected point
      if (selectedPoint !== null) {
        const lines = gameState.plane.linesThrough(selectedPoint);
        const linePointArrays: number[][] = [];
        const slopeIndices: number[] = [];
        for (const lid of lines) {
          linePointArrays.push([...gameState.plane.linePoints(lid)]);
          slopeIndices.push(gameState.plane.lineSlope(lid));
        }
        drawLineHighlights(ctx, layout, linePointArrays, slopeIndices);
      }

      // Draw pieces
      for (let i = 0; i < gameState.plane.numPoints; i++) {
        const cell = gameState.board[i];
        if (cell === CellState.Black || cell === CellState.White) {
          const isSelected = i === selectedPoint;
          drawPiece(ctx, layout, i, cell as 1 | 2, isSelected, time);
        }
      }

      // Draw move targets
      if (availableMoves.length > 0) {
        const targets = availableMoves.map(m => m.to);
        const unique = [...new Set(targets)];
        drawMoveTargets(ctx, layout, unique, time);
      }

      // Draw hover indicator
      if (hoveredPoint !== null && gameState.board[hoveredPoint] === CellState.Empty && selectedPoint !== null) {
        const [hx, hy] = layout.pointToPixel(hoveredPoint);
        ctx.beginPath();
        ctx.arc(hx, hy, layout.spacing * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
        ctx.fill();
      }

      // Draw capture effects
      if (captureAnimations.length > 0) {
        const elapsed = time - captureStartRef.current;
        const progress = Math.min(elapsed / 500, 1);
        for (const cap of captureAnimations) {
          drawCaptureEffect(ctx, layout, cap, progress);
        }
      }

      // Draw last move indicator
      if (gameState.lastMove) {
        const [fx, fy] = layout.pointToPixel(gameState.lastMove.from);
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(167, 139, 250, 0.4)";
        ctx.fill();

        const [tx, ty] = layout.pointToPixel(gameState.lastMove.to);
        ctx.strokeStyle = "rgba(167, 139, 250, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [gameState, selectedPoint, availableMoves, captureAnimations, hoveredPoint]);

  // ── Mouse Interaction ────────────────────────────────────────

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const layout = layoutRef.current;
      if (!canvas || !layout) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = layout.pixelToPoint(x, y);

      if (point >= 0) {
        onPointClick(point);
      }
    },
    [onPointClick],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const layout = layoutRef.current;
      if (!canvas || !layout) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = layout.pixelToPoint(x, y);
      setHoveredPoint(point >= 0 ? point : null);

      canvas.style.cursor = point >= 0 ? "pointer" : "default";
    },
    [],
  );

  return (
    <div className={`canvas-container ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      />
    </div>
  );
}
