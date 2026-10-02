import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { RAHU, SURYA } from "@grahan/engine";
import StoneIcon from "@/components/StoneIcon";
import { EclipseDiagram, ReachDiagram } from "@/components/RuleDiagrams";

export const metadata: Metadata = {
  title: "Rules",
  description: "The complete rules of Grahan: sliding along straight lines and diagonals, eclipsing enemy stones, and winning conditions.",
};

export default function RulesPage() {
  return (
    <>
      <SiteNav />
      <main className="page">
        <header className="prose-col" style={{ padding: "2.5rem 0 1rem" }}>
          <p className="deva muted" aria-hidden="true">नियम</p>
          <h1 className="h-hero">The rules</h1>
          <p className="lede">
            Grahan is a game of celestial strategy for two players. Stones slide along straight lines and diagonals,
            and any enemy piece caught in a sandwich between two of yours is eclipsed.
          </p>
        </header>

        <div className="rules-grid">
          <section>
            <h2 className="h-section">The players</h2>
            <div className="prose-col">
              <p>
                <StoneIcon who={RAHU} size={18} /> <strong>Rahu</strong> is the shadow. Rahu plays the dark stones
                and always moves first. <StoneIcon who={SURYA} size={18} /> <strong>Surya</strong> is the sun and
                plays the bright stones. In ancient mythology Rahu swallows the sun to cause an eclipse. In this game,
                both sides can eclipse enemy pieces.
              </p>
              <p>
                Matches are played on grids from <strong>6 × 6</strong> up to <strong>10 × 10</strong>.
                Each side begins with two complete ranks of stones (12 stones each on 6 × 6, up to 20 stones on 10 × 10).
                Rahu fills the top two rows, Surya fills the bottom two rows, and the middle ranks start open.
              </p>
            </div>
          </section>

          <section>
            <h2 className="h-section">Moving</h2>
            <div className="prose-col">
              <p>
                On your turn you pick one of your stones and slide it along any straight line or diagonal:
                horizontally, vertically, or diagonally. You may slide as far as you like until blocked by another stone
                or the edge of the board. Stones cannot jump over other pieces.
              </p>
              <p>
                Movement is bounded by the grid edges — stones do not wrap around. You must make a legal move on your turn;
                passing is not allowed.
              </p>
              <ReachDiagram />
            </div>
          </section>

          <section>
            <h2 className="h-section">Eclipse (Capture)</h2>
            <div className="prose-col">
              <p>
                When your stone lands, look along every straight line and diagonal passing through it. If one or more
                enemy stones sit in an unbroken row next to your landing stone, and another friendly stone closes the row
                on the opposite side, all those enemy stones are eclipsed and removed from the board.
              </p>
              <p>
                Beware the interposition trap: if you slide your stone into a gap directly between two enemy stones,
                your stone is immediately captured by the opponent!
              </p>
              <p>
                A single move can complete sandwiches in multiple directions simultaneously, capturing enemies along both
                horizontal and vertical or diagonal lines at once.
              </p>
              <EclipseDiagram />
            </div>
          </section>

          <section>
            <h2 className="h-section">No repeats (Superko)</h2>
            <div className="prose-col">
              <p>
                You may not make a move that recreates a full board position (including whose turn it is) that has
                already occurred earlier in the match. This rule prevents players from cycling between identical positions indefinitely.
              </p>
            </div>
          </section>

          <section>
            <h2 className="h-section">Winning</h2>
            <div className="prose-col">
              <p>
                You win immediately if:
              </p>
              <ul>
                <li>You reach the capture target for your board size (5 captures on 6 × 6, up to 9 on 10 × 10).</li>
                <li>Your opponent has no legal moves remaining on their turn (trapped).</li>
                <li>
                  The maximum turn limit is reached (<strong>100 turns</strong> on 6 × 6, <strong>125</strong> on 7 × 7, <strong>150</strong> on 8 × 8, <strong>175</strong> on 9 × 9, and <strong>200 turns</strong> on 10 × 10). The player with more stones remaining on the board wins (or a draw if stone counts are tied).
                </li>
              </ul>
              <p className="mt-4">
                <Link href="/play" className="btn btn-brass">Ready to play? Start a game</Link>
              </p>
            </div>
          </section>
        </div>
      </main>
      <footer className="site-footer">
        Grahan (व्यास) · Two players, one board, infinite possibilities.
      </footer>
    </>
  );
}
