"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { applyMove, newGame, outcome, type GameState } from "@grahan/engine";
import Board from "@/components/Board";
import SiteNav from "@/components/SiteNav";
import { requestMove } from "@/lib/ai-client";

/** Two computer players, playing forever in the hero on 6x6. */
function DemoBoard() {
  const [state, setState] = useState<GameState>(() => newGame("grahan-6"));

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    if (outcome(state).winner !== null) {
      timer = window.setTimeout(() => setState(newGame("grahan-6")), 3500);
    } else {
      requestMove(state, { maxDepth: 2, timeMs: 250, noise: 120 }, 1300).then((move) => {
        if (!cancelled && move) setState(applyMove(state, move));
      });
    }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  return <Board state={state} interactive={false} label="Demonstration game between two computer players" />;
}

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="hero">
          <span className="hero-glyph" aria-hidden="true">ग्रहण</span>
          <div className="hero-copy">
            <h1 className="h-hero">Grahan</h1>
            <p className="lede mt-6">
              A game of shadows and suns. Slide your stones along straight lines and diagonals across the board.
              Catch an enemy between two of yours and it is eclipsed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/play" className="btn btn-brass">Play now</Link>
              <Link href="/tutorial" className="btn btn-line">Learn in 3 minutes</Link>
            </div>
          </div>
          <figure className="hero-board">
            <DemoBoard />
            <figcaption className="caption">Two computer players, live on the 6 × 6 board.</figcaption>
          </figure>
        </section>

        <hr className="rule-brass mx-auto max-w-5xl" />

        <section className="three-rules" aria-label="The rules in brief">
          <div>
            <h2 className="h-small">Slide</h2>
            <p className="muted mt-2">
              On your turn, move one stone any distance along a line: across, down, or diagonal.
              Stones move straight and never jump over others.
            </p>
          </div>
          <div>
            <h2 className="h-small">Grid</h2>
            <p className="muted mt-2">
              Movement stops at the board edges. Choose board sizes from 6 × 6 up to 10 × 10,
              each starting with two full ranks of stones per side.
            </p>
          </div>
          <div>
            <h2 className="h-small">Eclipse</h2>
            <p className="muted mt-2">
              Land so that enemy stones sit between two of yours along a straight line or diagonal, and they are taken.
              Reach the capture target to win.
            </p>
          </div>
        </section>

        <section className="page pb-8">
          <div className="plate grid gap-6 p-6 md:grid-cols-[1fr_1.4fr] md:p-10">
            <h2 className="h-section">Cosmic Harmony & Geometry</h2>
            <div className="prose-col muted">
              <p>
                Rahu, the shadow, commands the dark orbs and always strikes first. Surya, the sun, commands
                the radiant gold pieces. Both sides begin positioned across from each other in double ranks.
              </p>
              <p>
                Pieces slide in continuous straight trajectories — horizontally, vertically, and diagonally —
                seeking cross-fire positions where multiple enemy stones can be eclipsed in a single decisive turn.
              </p>
              <p className="mt-4">
                <Link href="/about" className="text-brass underline underline-offset-4">Read the full rules</Link>
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        Grahan (ग्रहण) means eclipse. In the ancient lore the shadow Rahu chases the sun across the sky.
      </footer>
    </>
  );
}
