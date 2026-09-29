"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import GameCanvas from "@/components/GameCanvas";
import { useGame } from "@/hooks/useGame";
import { CellState, GameResult, createGrahan3, slidesFrom, applyMove, legalMoves } from "@/lib/engine";

// ─── Tutorial Steps ─────────────────────────────────────────────

interface TutorialStep {
  title: string;
  description: string;
  instruction: string;
  highlight?: "board" | "pieces" | "lines" | "capture";
  requireAction?: boolean;
}

const STEPS: TutorialStep[] = [
  {
    title: "Welcome to GRAHAN",
    description: "GRAHAN (ग्रहण, \"Eclipse\") is a strategy game played on a mathematical grid called an Affine Plane. Don't worry — you don't need to know the math to play!",
    instruction: "Click \"Next\" to continue.",
  },
  {
    title: "The Board",
    description: "This 3×3 grid has 9 points. Your pieces are the violet orbs (Eclipse). Your opponent's are gold (Sol). The middle row starts empty.",
    instruction: "Look at the board — each side has 3 pieces.",
    highlight: "board",
  },
  {
    title: "Moving Pieces",
    description: "Click one of your violet pieces to select it. You'll see green dots showing where you can slide to. Pieces slide along lines — horizontally, vertically, or diagonally.",
    instruction: "Try clicking a violet piece to see its moves.",
    highlight: "pieces",
    requireAction: true,
  },
  {
    title: "Lines Wrap Around!",
    description: "This board is a torus — lines wrap around the edges! If you slide off the right side, you appear on the left. Same for top/bottom. The dashed colored lines show the geometric lines through your selected piece.",
    instruction: "Notice how some lines connect to the opposite edge.",
    highlight: "lines",
  },
  {
    title: "Making a Move",
    description: "After selecting a piece, click any green dot to slide there. You can only slide to empty points, and you can't jump over other pieces.",
    instruction: "Click a green dot to make your first move!",
    requireAction: true,
  },
  {
    title: "Custodial Capture (\"Eclipse\")",
    description: "The key mechanic! When your piece lands and creates a \"sandwich\" — your piece on both sides of enemy pieces along a line — you capture all the enemy pieces in between. This is the Eclipse!",
    instruction: "Think: your piece + enemy pieces + your piece = capture!",
    highlight: "capture",
  },
  {
    title: "Capture Example",
    description: "If your pieces are at positions A and C, and enemy pieces are at B (between A and C on the same line), moving to complete the sandwich captures B. Remember: only the piece that just moved triggers captures!",
    instruction: "Moving INTO a sandwich doesn't get you captured — only the mover captures.",
  },
  {
    title: "Winning the Game",
    description: "On this 3×3 board, the first player to capture 2 enemy stones wins! On the full 5×5 board, you need 4 captures.",
    instruction: "Keep playing to try and capture 2 stones!",
  },
  {
    title: "Multiple Line Captures",
    description: "A single move can trigger captures on multiple lines at once — this is called a \"Total Eclipse\"! Each of the lines through your landing point is checked independently.",
    instruction: "Look for moves that sandwich on more than one line.",
  },
  {
    title: "You're Ready!",
    description: "That's everything you need to know! Select pieces, slide them along lines (they wrap around!), and sandwich enemies to capture. First to reach the capture target wins.",
    instruction: "Continue playing, or head to the 5×5 board for the full experience!",
  },
];

// ─── Tutorial Page ──────────────────────────────────────────────

export default function TutorialPage() {
  const [step, setStep] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const game = useGame(3, "pvp", 1);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const canProceed = !currentStep.requireAction || hasInteracted;

  // Track interaction for steps that require it
  useEffect(() => {
    if (game.selectedPoint !== null || game.gameState.ply > 0) {
      setHasInteracted(true);
    }
  }, [game.selectedPoint, game.gameState.ply]);

  const nextStep = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      setHasInteracted(false);
    }
  }, [step]);

  const prevStep = useCallback(() => {
    if (step > 0) {
      setStep(s => s - 1);
      setHasInteracted(false);
    }
  }, [step]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <nav className="flex items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-eclipse-500 to-nebula-blue" />
          <span className="font-display font-semibold text-sm hidden sm:inline">GRAHAN</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">
            Tutorial · Step {step + 1}/{STEPS.length}
          </span>
          <Link href="/play" className="btn-ghost text-xs px-3 py-1.5">
            Skip to Game →
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {/* Board */}
        <div className="flex-1 w-full max-w-[500px]">
          <GameCanvas
            gameState={game.gameState}
            selectedPoint={game.selectedPoint}
            availableMoves={game.availableMoves}
            captureAnimations={game.captureAnimations}
            onPointClick={game.selectPoint}
            onClearAnimations={game.clearAnimations}
          />
        </div>

        {/* Tutorial Panel */}
        <div className="w-full lg:w-80 space-y-4">
          {/* Progress bar */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? "bg-eclipse-500" : "bg-void-700"
                }`}
              />
            ))}
          </div>

          {/* Content Card */}
          <div className="tutorial-callout animate-fade-in" key={step}>
            <h2 className="heading-3 text-white mb-3">{currentStep.title}</h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {currentStep.description}
            </p>
            <div className="flex items-start gap-2 p-3 bg-void-900/60 rounded-lg">
              <span className="text-eclipse-400 text-sm mt-0.5">💡</span>
              <p className="text-xs text-gray-400 leading-relaxed">
                {currentStep.instruction}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="btn-ghost flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            {isLastStep ? (
              <Link href="/play" className="btn-primary flex-1 text-center">
                Play 5×5 →
              </Link>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canProceed}
                className={`btn-primary flex-1 ${!canProceed ? "opacity-50" : ""}`}
              >
                Next →
              </button>
            )}
          </div>

          {/* Game state info */}
          <div className="glass-subtle p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Turn</span>
              <span className={game.gameState.turn === CellState.Black ? "text-player-black" : "text-player-white"}>
                {game.gameState.turn === CellState.Black ? "Eclipse (You)" : "Sol (Opponent)"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Captures</span>
              <span className="text-gray-300 font-mono">
                {game.gameState.captured[0]} – {game.gameState.captured[1]}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Goal</span>
              <span className="text-gray-300">Capture 2 stones</span>
            </div>
          </div>

          {/* Reset tutorial game */}
          <button
            onClick={() => game.newGame(3, "pvp", 1)}
            className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
          >
            Reset board
          </button>
        </div>
      </div>
    </main>
  );
}
