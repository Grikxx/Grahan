/**
 * Runs the search in a Web Worker so the board keeps animating while the
 * computer thinks. Falls back to the main thread if workers are unavailable.
 */
import { chooseMove, toSnapshot, type GameState, type Move, type SearchOptions } from "@grahan/engine";
import type { AIRequest, AIResponse } from "@/workers/ai.worker";

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 1;
const pending = new Map<number, (move: Move | null, failed?: boolean) => void>();

function getWorker(): Worker | null {
  if (workerFailed || typeof window === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker("/ai-worker.js");
    worker.onmessage = (e: MessageEvent<AIResponse>) => {
      const resolve = pending.get(e.data.id);
      pending.delete(e.data.id);
      resolve?.(e.data.move, Boolean(e.data.error));
    };
    worker.onerror = () => {
      workerFailed = true;
      worker?.terminate();
      worker = null;
      for (const resolve of pending.values()) resolve(null, true);
      pending.clear();
    };
    return worker;
  } catch {
    workerFailed = true;
    return null;
  }
}

/** Asks for a move. `minMs` keeps very fast replies from feeling abrupt. */
export function requestMove(state: GameState, options: SearchOptions, minMs = 0): Promise<Move | null> {
  const started = performance.now();
  const delay = <T,>(value: T) =>
    new Promise<T>((res) => setTimeout(() => res(value), Math.max(0, minMs - (performance.now() - started))));

  const w = getWorker();
  if (!w) {
    return new Promise<Move | null>((res) => setTimeout(() => res(chooseMove(state, options).move), 30)).then(delay);
  }
  const id = nextId++;
  const request: AIRequest = { id, snapshot: toSnapshot(state), options };
  return new Promise<Move | null>((resolve) => {
    pending.set(id, (move, failed) => {
      resolve(move ?? (failed || workerFailed ? chooseMove(state, options).move : null));
    });
    w.postMessage(request);
  }).then(delay);
}
