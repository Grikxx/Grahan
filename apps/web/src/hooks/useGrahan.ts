"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  LEVELS, RAHU, SURYA,
  applyMove, isLegal, legalMovesFrom, newGame, outcome, threatenedStones,
  type GameState, type Level, type Move, type Player, type VariantId,
} from "@grahan/engine";
import { requestMove } from "@/lib/ai-client";
import { playWin } from "@/lib/sound";

export type Opponent = "computer" | "friend";

export interface Setup {
  variant: VariantId;
  opponent: Opponent;
  level: Level;
  /** Side the human plays against the computer. */
  human: Player;
}

export const DEFAULT_SETUP: Setup = { variant: "grahan-6", opponent: "computer", level: 2, human: RAHU };

interface State {
  setup: Setup;
  /** Every position of the game, oldest first. */
  timeline: GameState[];
  selected: number | null;
  hint: Move | null;
  hinting: boolean;
}

type Action =
  | { type: "start"; setup: Setup }
  | { type: "select"; cell: number | null }
  | { type: "play"; move: Move }
  | { type: "undo"; plies: number }
  | { type: "hinting"; on: boolean }
  | { type: "hint"; move: Move | null };

function init(setup: Setup): State {
  return { setup, timeline: [newGame(setup.variant)], selected: null, hint: null, hinting: false };
}

function reducer(s: State, a: Action): State {
  const current = s.timeline[s.timeline.length - 1];
  switch (a.type) {
    case "start":
      return init(a.setup);
    case "select":
      return { ...s, selected: a.cell };
    case "play":
      if (!isLegal(current, a.move)) return s;
      return { ...s, timeline: [...s.timeline, applyMove(current, a.move)], selected: null, hint: null };
    case "undo": {
      const keep = Math.max(1, s.timeline.length - a.plies);
      return { ...s, timeline: s.timeline.slice(0, keep), selected: null, hint: null, hinting: false };
    }
    case "hinting":
      return { ...s, hinting: a.on };
    case "hint":
      return { ...s, hint: a.move, hinting: false };
  }
}

export function useGrahan(initial: Setup = DEFAULT_SETUP) {
  const [s, dispatch] = useReducer(reducer, initial, init);
  const current = s.timeline[s.timeline.length - 1];
  const result = useMemo(() => outcome(current), [current]);
  const over = result.winner !== null;
  const { setup } = s;

  const isHumanTurn = setup.opponent === "friend" || current.turn === setup.human;
  const canAct = !over && isHumanTurn;
  const thinking = !over && !isHumanTurn;

  const targets = useMemo(
    () => (s.selected !== null && canAct ? legalMovesFrom(current, s.selected) : []),
    [current, s.selected, canAct],
  );

  const danger = useMemo(() => (over ? new Set<number>() : threatenedStones(current, current.turn)), [current, over]);

  const epoch = useRef(0);
  useEffect(() => {
    epoch.current++;
  }, [s.timeline]);

  const animating = useRef(false);
  const setAnimating = useCallback((busy: boolean) => {
    animating.current = busy;
  }, []);

  // Computer's turn
  useEffect(() => {
    if (over || setup.opponent !== "computer" || current.turn === setup.human) return;
    const token = epoch.current;
    let cancelled = false;
    requestMove(current, LEVELS[setup.level], 650).then(async (move) => {
      for (let i = 0; i < 20 && animating.current; i++) await new Promise((r) => setTimeout(r, 50));
      if (cancelled || token !== epoch.current) return;
      if (move) dispatch({ type: "play", move });
    });
    return () => {
      cancelled = true;
    };
  }, [current, over, setup.opponent, setup.human, setup.level]);

  // Win jingle
  const announced = useRef<GameState | null>(null);
  useEffect(() => {
    if (over && announced.current !== current) {
      announced.current = current;
      const humanWon =
        setup.opponent === "friend" ||
        (result.winner === "rahu" && setup.human === RAHU) ||
        (result.winner === "surya" && setup.human === SURYA);
      if (humanWon && result.winner !== "draw") setTimeout(playWin, 900);
    }
  }, [over, current, result.winner, setup.opponent, setup.human]);

  const clickCell = useCallback(
    (cell: number) => {
      if (!canAct) return;
      if (s.selected !== null) {
        const m = targets.find((t) => t.to === cell);
        if (m) {
          dispatch({ type: "play", move: m });
          return;
        }
      }
      if (current.board[cell] === current.turn && cell !== s.selected) dispatch({ type: "select", cell });
      else dispatch({ type: "select", cell: null });
    },
    [canAct, s.selected, targets, current],
  );

  const deselect = useCallback(() => dispatch({ type: "select", cell: null }), []);

  const undo = useCallback(() => {
    const t = s.timeline;
    if (t.length <= 1) return;
    if (setup.opponent === "friend") return dispatch({ type: "undo", plies: 1 });
    let plies = 1;
    while (t.length - plies > 1 && t[t.length - 1 - plies].turn !== setup.human) plies++;
    if (t[t.length - 1 - plies]?.turn !== setup.human) return;
    dispatch({ type: "undo", plies });
  }, [s.timeline, setup.opponent, setup.human]);

  const canUndo =
    s.timeline.length > 1 &&
    (setup.opponent === "friend" || s.timeline.slice(0, -1).some((g) => g.turn === setup.human));

  const askHint = useCallback(() => {
    if (!canAct || s.hinting) return;
    const token = epoch.current;
    dispatch({ type: "hinting", on: true });
    requestMove(current, LEVELS[2], 300).then((move) => {
      if (token === epoch.current) dispatch({ type: "hint", move });
    });
  }, [canAct, current, s.hinting]);

  const start = useCallback((next: Setup) => dispatch({ type: "start", setup: next }), []);

  return {
    setup,
    state: current,
    timeline: s.timeline,
    result,
    over,
    selected: s.selected,
    targets,
    danger,
    hint: s.hint,
    thinking,
    hinting: s.hinting,
    isHumanTurn,
    canAct,
    canUndo,
    clickCell,
    deselect,
    undo,
    askHint,
    start,
    setAnimating,
  };
}
