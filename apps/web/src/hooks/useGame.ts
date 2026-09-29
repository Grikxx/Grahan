"use client";

import { useCallback, useReducer } from "react";
import {
  type GameState, type Move, type Player, type GameResultType,
  CellState, GameResult, opponent,
  createGrahan3, createGrahan5,
  legalMoves, slidesFrom, applyMove, checkGameResult, findBestMove,
} from "@/lib/engine";

// ─── State ──────────────────────────────────────────────────────

export type GameMode = "pvp" | "pve";
export type BoardSize = 3 | 5;
export type Difficulty = 1 | 2 | 3;

interface UIState {
  gameState: GameState;
  selectedPoint: number | null;
  availableMoves: Move[];
  gameResult: GameResultType;
  mode: GameMode;
  boardSize: BoardSize;
  difficulty: Difficulty;
  isAIThinking: boolean;
  moveHistory: Move[];
  captureAnimations: number[]; // points being animated
}

type Action =
  | { type: "SELECT_POINT"; point: number }
  | { type: "DESELECT" }
  | { type: "MAKE_MOVE"; move: Move }
  | { type: "AI_MOVE"; move: Move }
  | { type: "AI_THINKING"; thinking: boolean }
  | { type: "NEW_GAME"; size: BoardSize; mode: GameMode; difficulty: Difficulty }
  | { type: "UNDO" }
  | { type: "CLEAR_ANIMATIONS" };

function createState(size: BoardSize, mode: GameMode, difficulty: Difficulty): UIState {
  const gameState = size === 3 ? createGrahan3() : createGrahan5();
  return {
    gameState,
    selectedPoint: null,
    availableMoves: [],
    gameResult: GameResult.Ongoing,
    mode,
    boardSize: size,
    difficulty,
    isAIThinking: false,
    moveHistory: [],
    captureAnimations: [],
  };
}

function reducer(state: UIState, action: Action): UIState {
  switch (action.type) {
    case "SELECT_POINT": {
      const { point } = action;
      const { gameState } = state;

      // If clicking the same point, deselect
      if (state.selectedPoint === point) {
        return { ...state, selectedPoint: null, availableMoves: [] };
      }

      // If a point is selected and clicking a move target, make the move
      if (state.selectedPoint !== null) {
        const move = state.availableMoves.find(m => m.to === point);
        if (move) {
          return reducer(state, { type: "MAKE_MOVE", move });
        }
      }

      // If clicking own piece, select it
      if (gameState.board[point] === gameState.turn) {
        const moves = slidesFrom(gameState, point);
        return { ...state, selectedPoint: point, availableMoves: moves };
      }

      // Clicking empty or enemy piece — deselect
      return { ...state, selectedPoint: null, availableMoves: [] };
    }

    case "DESELECT":
      return { ...state, selectedPoint: null, availableMoves: [] };

    case "MAKE_MOVE": {
      const newGameState = applyMove(state.gameState, action.move);
      const result = checkGameResult(newGameState);
      return {
        ...state,
        gameState: newGameState,
        selectedPoint: null,
        availableMoves: [],
        gameResult: result,
        moveHistory: [...state.moveHistory, action.move],
        captureAnimations: newGameState.lastCaptured ?? [],
      };
    }

    case "AI_MOVE": {
      const newGameState = applyMove(state.gameState, action.move);
      const result = checkGameResult(newGameState);
      return {
        ...state,
        gameState: newGameState,
        selectedPoint: null,
        availableMoves: [],
        gameResult: result,
        isAIThinking: false,
        moveHistory: [...state.moveHistory, action.move],
        captureAnimations: newGameState.lastCaptured ?? [],
      };
    }

    case "AI_THINKING":
      return { ...state, isAIThinking: action.thinking };

    case "NEW_GAME":
      return createState(action.size, action.mode, action.difficulty);

    case "CLEAR_ANIMATIONS":
      return { ...state, captureAnimations: [] };

    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────

export function useGame(
  initialSize: BoardSize = 5,
  initialMode: GameMode = "pve",
  initialDifficulty: Difficulty = 2,
) {
  const [state, dispatch] = useReducer(reducer, createState(initialSize, initialMode, initialDifficulty));

  const selectPoint = useCallback((point: number) => {
    if (state.gameResult !== GameResult.Ongoing) return;
    if (state.isAIThinking) return;
    dispatch({ type: "SELECT_POINT", point });
  }, [state.gameResult, state.isAIThinking]);

  const makeMove = useCallback((move: Move) => {
    dispatch({ type: "MAKE_MOVE", move });
  }, []);

  const triggerAI = useCallback(() => {
    if (state.gameResult !== GameResult.Ongoing) return;
    dispatch({ type: "AI_THINKING", thinking: true });

    // Run AI in a setTimeout to not block the UI
    setTimeout(() => {
      const bestMove = findBestMove(state.gameState, state.difficulty);
      if (bestMove) {
        dispatch({ type: "AI_MOVE", move: bestMove });
      }
    }, 100);
  }, [state.gameState, state.gameResult, state.difficulty]);

  const newGame = useCallback((size: BoardSize, mode: GameMode, difficulty: Difficulty) => {
    dispatch({ type: "NEW_GAME", size, mode, difficulty });
  }, []);

  const clearAnimations = useCallback(() => {
    dispatch({ type: "CLEAR_ANIMATIONS" });
  }, []);

  return {
    ...state,
    selectPoint,
    makeMove,
    triggerAI,
    newGame,
    clearAnimations,
  };
}
