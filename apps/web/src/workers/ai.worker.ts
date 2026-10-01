/// <reference lib="webworker" />
import { chooseMove, fromSnapshot, type SearchOptions, type Snapshot } from "@grahan/engine";

export interface AIRequest {
  id: number;
  snapshot: Snapshot;
  options: SearchOptions;
}

export interface AIResponse {
  id: number;
  move: ReturnType<typeof chooseMove>["move"];
  depth: number;
  error?: string;
}

self.onmessage = (e: MessageEvent<AIRequest>) => {
  const { id, snapshot, options } = e.data;
  try {
    const result = chooseMove(fromSnapshot(snapshot), options);
    (self as unknown as Worker).postMessage({ id, move: result.move, depth: result.depth } satisfies AIResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, move: null, depth: 0, error: String(err) } satisfies AIResponse);
  }
};
