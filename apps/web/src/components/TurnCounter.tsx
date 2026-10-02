import React from "react";
import { RAHU, SURYA, currentTurn, completedTurns, type Player } from "@grahan/engine";
import StoneIcon from "./StoneIcon";

interface TurnCounterProps {
  ply: number;
  maxTurns: number;
  maxPly: number;
  turn: Player;
  over?: boolean;
  variantName?: string;
}

export default function TurnCounter({
  ply,
  maxTurns,
  turn,
  over = false,
  variantName,
}: TurnCounterProps) {
  // Current turn (1-based), capped at maxTurns
  const turnNum = currentTurn(ply, maxTurns);
  const doneTurns = completedTurns(ply);
  const remaining = Math.max(0, maxTurns - doneTurns);
  const progressPct = Math.min(100, Math.round((doneTurns / maxTurns) * 100));

  // Within the current turn, which half-move is it?
  // ply % 2 === 0 -> Rahu is to move (1st half)
  // ply % 2 === 1 -> Surya is to move (2nd half)
  const isRahuHalf = ply % 2 === 0;
  const isSuryaHalf = ply % 2 === 1;

  const isNearingLimit = remaining <= 10 && remaining > 0;
  const isLimitReached = remaining === 0;

  return (
    <div className={`turn-counter-card ${isNearingLimit ? "near-limit" : ""} ${isLimitReached ? "limit-reached" : ""}`} role="region" aria-label="Turn Counter">
      <div className="turn-counter-header">
        <div className="turn-badge">
          <span className="turn-badge-label">Turn</span>
          <span className="turn-badge-current">{turnNum}</span>
          <span className="turn-badge-max">/ {maxTurns}</span>
        </div>
        <div className="turn-status-meta">
          {variantName && <span className="turn-variant-tag">{variantName}</span>}
          <span className="turn-remaining-tag">
            {over
              ? `${doneTurns} turn${doneTurns === 1 ? "" : "s"} played`
              : `${remaining} turn${remaining === 1 ? "" : "s"} left`}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div
        className="turn-track"
        role="progressbar"
        aria-valuenow={doneTurns}
        aria-valuemin={0}
        aria-valuemax={maxTurns}
        aria-label={`Turn ${turnNum} of ${maxTurns}`}
      >
        <div
          className="turn-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Half-move phase indicators */}
      {!over && (
        <div className="turn-phases">
          <div className={`phase-step ${isRahuHalf ? "phase-active" : "phase-done"}`}>
            <StoneIcon who={RAHU} size={15} />
            <span className="phase-text">Rahu {isRahuHalf ? "(1st • to move)" : "(1st • done)"}</span>
          </div>
          <span className="phase-arrow" aria-hidden="true">→</span>
          <div className={`phase-step ${isSuryaHalf ? "phase-active" : isRahuHalf ? "phase-pending" : "phase-done"}`}>
            <StoneIcon who={SURYA} size={15} />
            <span className="phase-text">Surya {isSuryaHalf ? "(2nd • to move)" : "(2nd)"}</span>
          </div>
        </div>
      )}

      {over && (
        <div className="turn-over-note text-xs muted text-center mt-1">
          {isLimitReached ? `Max limit of ${maxTurns} turns reached` : `Match ended on Turn ${turnNum}`}
        </div>
      )}
    </div>
  );
}
