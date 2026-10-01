"use client";

import { useMemo } from "react";
import { legalMovesFrom, positionFromRows, type GameState } from "@grahan/engine";
import Board from "@/components/Board";

const point = (state: GameState, name: string) =>
  state.plane.point(name.charCodeAt(0) - 97, Number(name.slice(1)) - 1);

/** One Rahu stone on c3 of an empty 6 × 6 board, with every point it can reach along straight lines and diagonals. */
export function ReachDiagram() {
  const { state, from, targets } = useMemo(() => {
    const s = positionFromRows("grahan-6", [
      "......",
      "......",
      "..R...",
      "......",
      "......",
      "......",
    ]);
    const c3 = point(s, "c3");
    return { state: s, from: c3, targets: legalMovesFrom(s, c3) };
  }, []);
  return (
    <figure className="diagram">
      <Board state={state} selected={from} targets={targets} interactive={false} label="A stone on c3 and every point it can reach" />
      <figcaption className="caption">
        A lone stone on c3 can slide along its row, column, and diagonals until the edges of the board.
      </figcaption>
    </figure>
  );
}

/** Rahu can slide a4 → c4 and eclipse the sun on c3, held between c2 and c4. */
export function EclipseDiagram() {
  const { state, move } = useMemo(() => {
    const s = positionFromRows("grahan-6", [
      "......",
      "..R...",
      "..S...",
      "R.....",
      "......",
      "......",
    ]);
    const to = point(s, "c4");
    const best = legalMovesFrom(s, point(s, "a4"))
      .filter((m) => m.to === to)
      .sort((a, b) => a.steps - b.steps)[0];
    return { state: s, move: best ?? null };
  }, []);
  return (
    <figure className="diagram">
      <Board state={state} hint={move} interactive={false} label="Rahu can slide from a4 to c4 and eclipse the sun on c3" />
      <figcaption className="caption">
        If Rahu slides a4 → c4, the sun on c3 sits between c2 and c4 and is eclipsed.
      </figcaption>
    </figure>
  );
}
