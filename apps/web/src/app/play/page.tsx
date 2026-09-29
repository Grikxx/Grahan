"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GameCanvas from "@/components/GameCanvas";
import GameHUD from "@/components/GameHUD";
import { useGame, type BoardSize, type GameMode, type Difficulty } from "@/hooks/useGame";
import { CellState, GameResult } from "@/lib/engine";

export default function PlayPage() {
  const [setupDone, setSetupDone] = useState(false);
  const [boardSize, setBoardSize] = useState<BoardSize>(5);
  const [mode, setMode] = useState<GameMode>("pve");
  const [difficulty, setDifficulty] = useState<Difficulty>(2);

  const game = useGame(boardSize, mode, difficulty);

  // Auto-trigger AI when it's the AI's turn
  useEffect(() => {
    if (
      mode === "pve" &&
      game.gameResult === GameResult.Ongoing &&
      game.gameState.turn === CellState.White &&
      !game.isAIThinking
    ) {
      const timer = setTimeout(() => game.triggerAI(), 300);
      return () => clearTimeout(timer);
    }
  }, [game.gameState.turn, game.gameResult, game.isAIThinking, mode, game]);

  if (!setupDone) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="glass p-8 max-w-md w-full space-y-6 animate-fade-in">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors">
              ← Back
            </Link>
            <h1 className="heading-2 text-white">New Game</h1>
            <p className="text-gray-400 text-sm mt-1">Configure your match</p>
          </div>

          {/* Board Size */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-mono">Board</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBoardSize(3)}
                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                  boardSize === 3
                    ? "bg-eclipse-600 text-white shadow-lg shadow-eclipse-600/25"
                    : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-600/50"
                }`}
              >
                3×3 Tutorial
              </button>
              <button
                onClick={() => setBoardSize(5)}
                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                  boardSize === 5
                    ? "bg-eclipse-600 text-white shadow-lg shadow-eclipse-600/25"
                    : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-600/50"
                }`}
              >
                5×5 Full
              </button>
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-mono">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("pve")}
                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                  mode === "pve"
                    ? "bg-eclipse-600 text-white shadow-lg shadow-eclipse-600/25"
                    : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-600/50"
                }`}
              >
                vs AI
              </button>
              <button
                onClick={() => setMode("pvp")}
                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                  mode === "pvp"
                    ? "bg-eclipse-600 text-white shadow-lg shadow-eclipse-600/25"
                    : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-600/50"
                }`}
              >
                Local PvP
              </button>
            </div>
          </div>

          {/* Difficulty (only for PvE) */}
          {mode === "pve" && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-mono">AI Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      difficulty === d
                        ? "bg-eclipse-600 text-white shadow-lg shadow-eclipse-600/25"
                        : "bg-void-700/50 text-gray-400 hover:text-white hover:bg-void-600/50"
                    }`}
                  >
                    {d === 1 ? "Novice" : d === 2 ? "Adept" : "Oracle"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              game.newGame(boardSize, mode, difficulty);
              setSetupDone(true);
            }}
            className="btn-primary w-full py-4 text-base"
          >
            Start Game
          </button>
        </div>
      </main>
    );
  }

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
            {boardSize}×{boardSize} · {mode === "pve" ? `AI ${["", "Novice", "Adept", "Oracle"][difficulty]}` : "PvP"}
          </span>
          <button
            onClick={() => setSetupDone(false)}
            className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-void-700/50 hover:border-void-500/50"
          >
            Settings
          </button>
        </div>
      </nav>

      {/* Game Area */}
      <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {/* Board */}
        <div className="flex-1 w-full max-w-[600px]">
          <GameCanvas
            gameState={game.gameState}
            selectedPoint={game.selectedPoint}
            availableMoves={game.availableMoves}
            captureAnimations={game.captureAnimations}
            onPointClick={game.selectPoint}
            onClearAnimations={game.clearAnimations}
          />

          {/* Mobile instruction hint */}
          <p className="text-center text-xs text-gray-600 mt-3 lg:hidden">
            {game.selectedPoint !== null
              ? "Tap a green dot to move"
              : game.gameState.turn === CellState.Black
              ? "Tap a violet piece to select"
              : mode === "pve"
              ? "AI is thinking..."
              : "Tap a gold piece to select"
            }
          </p>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 space-y-4">
          <GameHUD
            turn={game.gameState.turn}
            captured={game.gameState.captured}
            captureTarget={game.gameState.captureTarget}
            ply={game.gameState.ply}
            gameResult={game.gameResult}
            isAIThinking={game.isAIThinking}
            onNewGame={() => setSetupDone(false)}
          />

          {/* Quick Rules */}
          <div className="glass-subtle p-4 space-y-2 hidden lg:block">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider font-mono">Quick Rules</h3>
            <ul className="text-xs text-gray-400 space-y-1.5">
              <li className="flex gap-2">
                <span className="text-eclipse-400">→</span>
                Click a piece, then click where to slide
              </li>
              <li className="flex gap-2">
                <span className="text-eclipse-400">⊂⊃</span>
                Sandwich enemies between your pieces to capture
              </li>
              <li className="flex gap-2">
                <span className="text-eclipse-400">🏆</span>
                Capture {game.gameState.captureTarget} stones to win
              </li>
              <li className="flex gap-2">
                <span className="text-eclipse-400">∞</span>
                Lines wrap around — the board is a torus!
              </li>
            </ul>
          </div>

          {/* Controls hint */}
          <div className="glass-subtle p-4 hidden lg:block">
            <p className="text-xs text-gray-500">
              {game.selectedPoint !== null
                ? "Click a highlighted green point to move, or click another piece to reselect."
                : `Click one of your ${game.gameState.turn === CellState.Black ? "violet" : "gold"} pieces to see available moves.`
              }
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
