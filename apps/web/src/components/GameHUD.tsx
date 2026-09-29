"use client";

import type { Player, GameResultType } from "@/lib/engine";
import { CellState, GameResult } from "@/lib/engine";

interface GameHUDProps {
  turn: Player;
  captured: readonly [number, number];
  captureTarget: number;
  ply: number;
  gameResult: GameResultType;
  isAIThinking: boolean;
  onNewGame: () => void;
}

export default function GameHUD({
  turn,
  captured,
  captureTarget,
  ply,
  gameResult,
  isAIThinking,
  onNewGame,
}: GameHUDProps) {
  const isBlackTurn = turn === CellState.Black;
  const resultText = gameResult === GameResult.BlackWins
    ? "Eclipse wins!"
    : gameResult === GameResult.WhiteWins
    ? "Sol wins!"
    : gameResult === GameResult.Draw
    ? "Draw"
    : null;

  return (
    <div className="space-y-4">
      {/* Turn Indicator */}
      <div className="glass-subtle p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full transition-all duration-300 ${
              isBlackTurn
                ? "bg-player-black shadow-lg shadow-player-black/40"
                : "bg-player-white shadow-lg shadow-player-white/40"
            }`}
          />
          <span className="text-sm font-medium">
            {isAIThinking ? (
              <span className="text-gray-400 animate-pulse">AI thinking...</span>
            ) : resultText ? (
              <span className="text-sol">{resultText}</span>
            ) : (
              <span>{isBlackTurn ? "Eclipse" : "Sol"}&apos;s turn</span>
            )}
          </span>
        </div>
        <span className="text-xs text-gray-500 font-mono">Ply {ply}</span>
      </div>

      {/* Capture Progress */}
      <div className="glass-subtle p-4 space-y-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-mono">Captures</h3>

        {/* Eclipse (Black) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-player-black" />
              <span className="text-gray-300">Eclipse</span>
            </div>
            <span className="font-mono text-player-black">
              {captured[0]}/{captureTarget}
            </span>
          </div>
          <div className="h-1.5 bg-void-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-player-black/60 to-player-black rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (captured[0] / captureTarget) * 100)}%` }}
            />
          </div>
        </div>

        {/* Sol (White) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-player-white" />
              <span className="text-gray-300">Sol</span>
            </div>
            <span className="font-mono text-player-white">
              {captured[1]}/{captureTarget}
            </span>
          </div>
          <div className="h-1.5 bg-void-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-player-white/60 to-player-white rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (captured[1] / captureTarget) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game Over / New Game */}
      {gameResult !== GameResult.Ongoing && (
        <button
          onClick={onNewGame}
          className="btn-primary w-full"
        >
          New Game
        </button>
      )}
    </div>
  );
}
