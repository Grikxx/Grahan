import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { RAHU, SURYA } from "@grahan/engine";
import StoneIcon from "@/components/StoneIcon";
import { EclipseDiagram, ReachDiagram } from "@/components/RuleDiagrams";

export const metadata: Metadata = {
  title: "Rules of GRAHAN — Complete Guide",
  description: "Learn how to play GRAHAN: board setup, sliding moves, eclipse sandwich captures, passing, and winning conditions.",
};

export default function RulesPage() {
  return (
    <>
      <SiteNav />
      <main className="page">
        {/* Header */}
        <header className="rules-hero prose-col">
          <p className="deva muted" aria-hidden="true">नियम</p>
          <h1 className="h-hero">Rules</h1>
          <p className="lede">
            GRAHAN is a strategic board game of light and shadow for two players.
            Slide your stones across the grid, trap enemy pieces in an <strong>Eclipse Sandwich</strong>,
            and capture enough stones or outlast the turn limit to win.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            <Link href="/play" className="btn btn-brass">Play Now</Link>
            <Link href="/tutorial" className="btn btn-ghost">Interactive Tutorial</Link>
          </div>
        </header>

        {/* Quick Start / Overview Cards */}
        <section aria-labelledby="quick-overview-heading" style={{ marginBottom: "2.5rem" }}>
          <h2 id="quick-overview-heading" className="h-section" style={{ marginBottom: "1rem" }}>
            GRAHAN at a Glance
          </h2>
          <div className="rules-quick-grid">
            <div className="quick-card">
              <span className="quick-card-icon" aria-hidden="true">🌓</span>
              <h3 className="quick-card-title">Two Celestial Sides</h3>
              <p className="quick-card-text">
                <StoneIcon who={RAHU} size={15} /> <strong>Rahu</strong> (dark stones) moves first.{" "}
                <StoneIcon who={SURYA} size={15} /> <strong>Surya</strong> (gold stones) moves second.
              </p>
            </div>
            <div className="quick-card">
              <span className="quick-card-icon" aria-hidden="true">⚡</span>
              <h3 className="quick-card-title">Two Actions on Your Turn</h3>
              <p className="quick-card-text">
                On each turn, you can either <strong>slide one stone</strong> in any of 8 directions OR <strong>pass</strong>.
              </p>
            </div>
            <div className="quick-card">
              <span className="quick-card-icon" aria-hidden="true">🥪</span>
              <h3 className="quick-card-title">Eclipse Sandwich</h3>
              <p className="quick-card-text">
                Trap enemy stones in a straight line between the stone you just moved and another of your stones to capture them.
              </p>
            </div>
            <div className="quick-card">
              <span className="quick-card-icon" aria-hidden="true">🏆</span>
              <h3 className="quick-card-title">How to Win</h3>
              <p className="quick-card-text">
                First to capture the target number of stones wins immediately! If turns run out, the side with more stones wins.
              </p>
            </div>
          </div>
        </section>

        {/* Deep Dive Grid */}
        <div className="rules-grid">

          {/* 1. Setup & Board Sizes */}
          <section>
            <h2 className="h-section">1. Board &amp; Setup</h2>
            <div className="prose-col">
              <p>
                GRAHAN is played on square grids of various sizes from <strong>4 &times; 4</strong> up to <strong>10 &times; 10</strong>.
              </p>
              <ul>
                <li>
                  <strong>4 &times; 4</strong>: Rahu starts on the top row (<em>y</em> = 0, 4 stones); Surya starts on the bottom row (<em>y</em> = 3, 4 stones).
                </li>
                <li>
                  <strong>6 &times; 6 to 10 &times; 10</strong>: Rahu fills the top 2 rows; Surya fills the bottom 2 rows.
                </li>
                <li>
                  The middle rows start completely empty, leaving room for maneuvering.
                </li>
              </ul>

              <div className="rules-table-container">
                <table className="rules-table">
                  <thead>
                    <tr>
                      <th>Board Size</th>
                      <th>Stones per Side</th>
                      <th>Captures to Win</th>
                      <th>Max Plies (Turns)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>4 &times; 4</strong></td>
                      <td>4 stones</td>
                      <td className="highlight-col">3 captures</td>
                      <td>100 plies (50 turns)</td>
                    </tr>
                    <tr>
                      <td><strong>6 &times; 6</strong></td>
                      <td>12 stones</td>
                      <td className="highlight-col">5 captures</td>
                      <td>200 plies (100 turns)</td>
                    </tr>
                    <tr>
                      <td><strong>7 &times; 7</strong></td>
                      <td>14 stones</td>
                      <td className="highlight-col">6 captures</td>
                      <td>250 plies (125 turns)</td>
                    </tr>
                    <tr>
                      <td><strong>8 &times; 8</strong></td>
                      <td>16 stones</td>
                      <td className="highlight-col">7 captures</td>
                      <td>300 plies (150 turns)</td>
                    </tr>
                    <tr>
                      <td><strong>9 &times; 9</strong></td>
                      <td>18 stones</td>
                      <td className="highlight-col">8 captures</td>
                      <td>350 plies (175 turns)</td>
                    </tr>
                    <tr>
                      <td><strong>10 &times; 10</strong></td>
                      <td>20 stones</td>
                      <td className="highlight-col">9 captures</td>
                      <td>400 plies (200 turns)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                * A &ldquo;ply&rdquo; is a single action taken by one player. A full turn consists of one move by Rahu and one move by Surya (2 plies).
              </p>
            </div>
          </section>

          {/* 2. Movement & Passing */}
          <section>
            <h2 className="h-section">2. Your Turn</h2>
            <div className="prose-col">
              <p>
                When it is your turn, you must choose <strong>exactly one</strong> of two legal actions:
              </p>

              <div className="rules-card">
                <span className="rule-badge">Action Option A</span>
                <h3 className="step-title" style={{ fontSize: "1.05rem" }}>Slide a Stone</h3>
                <p className="step-desc">
                  Pick any one of your stones on the board and slide it in any of the <strong>8 directions</strong> (horizontal, vertical, or diagonal).
                </p>
                <ul style={{ marginTop: "0.5rem" }}>
                  <li>You can slide as many empty squares as you like in a straight line.</li>
                  <li><strong>No jumping</strong>: you cannot jump over any stones (friendly or enemy).</li>
                  <li><strong>No landing on stones</strong>: you can only stop on an unoccupied empty square.</li>
                </ul>
              </div>

              <div className="rules-card" style={{ marginTop: "1rem" }}>
                <span className="rule-badge">Action Option B</span>
                <h3 className="step-title" style={{ fontSize: "1.05rem" }}>Pass Your Turn</h3>
                <p className="step-desc">
                  You may choose to <strong>pass</strong> at any time instead of sliding a stone.
                </p>
                <ul style={{ marginTop: "0.5rem" }}>
                  <li>Passing moves nothing, captures nothing, and advances the turn counter by 1.</li>
                  <li><strong>No Stalemate</strong>: You can never be trapped or lose simply because you have no moves. Passing is always legal!</li>
                  <li>There is no penalty or limit on passing.</li>
                </ul>
              </div>

              <ReachDiagram />
            </div>
          </section>

          {/* 3. Captures */}
          <section>
            <h2 className="h-section">3. Capturing Stones</h2>
            <div className="prose-col">
              <p>
                Captures happen through an <strong>Eclipse Sandwich</strong>. Immediately after your stone slides and lands on its destination square, look out in all 8 directions.
              </p>

              <div className="steps-list">
                <div className="step-item">
                  <span className="step-num">1</span>
                  <div className="step-content">
                    <h4 className="step-title">The Setup</h4>
                    <p className="step-desc">
                      Look along any straight line (horizontal, vertical, or diagonal) radiating outward from the square your stone just landed on.
                    </p>
                  </div>
                </div>

                <div className="step-item">
                  <span className="step-num">2</span>
                  <div className="step-content">
                    <h4 className="step-title">The Sandwich Condition</h4>
                    <p className="step-desc">
                      If there is an <strong>unbroken run of one or more enemy stones</strong> immediately adjacent, and right after them sits another <strong>friendly stone</strong> of your color, the sandwich is closed!
                    </p>
                  </div>
                </div>

                <div className="step-item">
                  <span className="step-num">3</span>
                  <div className="step-content">
                    <h4 className="step-title">The Capture</h4>
                    <p className="step-desc">
                      All enemy stones caught between your two friendly stones are eclipsed and permanently removed from the board.
                    </p>
                  </div>
                </div>
              </div>

              {/* Crucial Capture Principles */}
              <div className="rule-callout safe">
                <strong>🛡️ Safe Haven (No Self-Capture):</strong> Sliding your stone between two enemy stones does <em>not</em> capture it. Your stone is completely safe! Only the player making the active move can trigger captures.
              </div>

              <div className="rule-callout note">
                <strong>⚡ Multi-Directional Captures:</strong> A single move can close sandwiches in multiple directions simultaneously (e.g. horizontally and diagonally at once), capturing all sandwiched enemy stones in one turn!
              </div>

              <div className="rule-callout">
                <strong>🚫 Gaps Break the Run:</strong> An empty square breaks the sandwich. If there is an empty space between enemy stones or before your friendly stone, no capture occurs.
              </div>

              <EclipseDiagram />
            </div>
          </section>

          {/* 4. Superko (Repetition Rule) */}
          <section>
            <h2 className="h-section">4. Repetition Rule (Superko)</h2>
            <div className="prose-col">
              <p>
                To prevent players from repeating moves endlessly in an infinite loop, GRAHAN uses <strong>Positional Superko</strong>:
              </p>

              <div className="rules-card">
                <ul style={{ margin: 0 }}>
                  <li>
                    <strong>Moves cannot repeat earlier positions:</strong> You are not allowed to make a slide if the resulting board state (the positions of all stones plus whose turn it is) has already occurred earlier in the game.
                  </li>
                  <li style={{ marginTop: "0.75rem" }}>
                    <strong>Passing is exempt:</strong> You can always pass freely, even if passing recreates an earlier board state. Superko restrictions only apply to sliding moves.
                  </li>
                  <li style={{ marginTop: "0.75rem" }}>
                    The game engine automatically enforces this and will prevent you from selecting any move that would cause an illegal repetition.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. How to Win */}
          <section>
            <h2 className="h-section">5. Winning the Game</h2>
            <div className="prose-col">
              <p>
                After every action (move or pass), the game checks for victory in this exact order:
              </p>

              <div className="rules-card">
                <span className="rule-badge" style={{ background: "rgb(246 185 59 / 0.15)", borderColor: "var(--color-sun)" }}>
                  Primary Win Condition
                </span>
                <h3 className="step-title" style={{ fontSize: "1.1rem", color: "var(--color-sun)" }}>
                  1. Capture Target (Immediate Win)
                </h3>
                <p className="step-desc" style={{ marginTop: "0.35rem" }}>
                  The first player to capture the target number of enemy stones (always equal to <em>n</em> &minus; 1, e.g. <strong>5 captures on a 6 &times; 6 board</strong>) wins the game immediately on the spot!
                </p>
              </div>

              <div className="rules-card" style={{ marginTop: "1rem" }}>
                <span className="rule-badge" style={{ background: "rgb(185 200 245 / 0.15)", borderColor: "var(--color-moon)" }}>
                  Secondary Win Condition
                </span>
                <h3 className="step-title" style={{ fontSize: "1.1rem", color: "var(--color-moon)" }}>
                  2. Turn Limit (Stone Count)
                </h3>
                <p className="step-desc" style={{ marginTop: "0.35rem" }}>
                  If neither player reaches the capture target before the maximum ply limit is reached:
                </p>
                <ul style={{ marginTop: "0.5rem" }}>
                  <li>The player with <strong>more stones left on the board</strong> wins!</li>
                  <li>If both players have the <strong>exact same number of stones</strong>, the match ends in a <strong>Draw</strong>.</li>
                </ul>
              </div>

              <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <Link href="/play" className="btn btn-brass">
                  Start Playing GRAHAN
                </Link>
                <Link href="/tutorial" className="btn btn-ghost">
                  Try Step-by-Step Tutorial
                </Link>
              </div>
            </div>
          </section>

        </div>
      </main>

      <footer className="site-footer">
        GRAHAN · Two players, one board, infinite possibilities.
      </footer>
    </>
  );
}
