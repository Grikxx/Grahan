"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-eclipse-500 to-nebula-blue" />
          <span className="font-display font-semibold text-sm">GRAHAN</span>
        </Link>
        <Link href="/play" className="btn-primary text-xs">Play</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="heading-1 text-white">Rules of GRAHAN</h1>
          <p className="text-gray-400">ग्रहण — Sanskrit for &ldquo;Eclipse&rdquo;</p>
        </div>

        {/* Overview */}
        <section className="glass p-6 space-y-4">
          <h2 className="heading-2 text-white">Overview</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            GRAHAN is a 2-player abstract strategy game played on a mathematical grid called
            an <strong className="text-eclipse-400">Affine Plane</strong>. The board is a
            square grid where lines wrap around the edges — imagine the grid printed on a donut (torus).
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            Players take turns sliding their stones along geometric lines. When you
            &ldquo;sandwich&rdquo; enemy stones between yours, you capture them. First to
            capture enough stones wins.
          </p>
        </section>

        {/* Board */}
        <section className="glass p-6 space-y-4">
          <h2 className="heading-2 text-white">The Board</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="heading-3 text-eclipse-400">Grahan-3 (Tutorial)</h3>
              <ul className="text-sm text-gray-300 space-y-1.5">
                <li>• <span className="text-gray-400 font-mono">9</span> points (3×3 grid)</li>
                <li>• <span className="text-gray-400 font-mono">12</span> lines (4 slopes × 3 lines each)</li>
                <li>• <span className="text-gray-400 font-mono">3</span> stones per player</li>
                <li>• Capture <span className="text-sol font-mono">2</span> stones to win</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="heading-3 text-sol">Grahan-5 (Full Game)</h3>
              <ul className="text-sm text-gray-300 space-y-1.5">
                <li>• <span className="text-gray-400 font-mono">25</span> points (5×5 grid)</li>
                <li>• <span className="text-gray-400 font-mono">30</span> lines (6 slopes × 5 lines each)</li>
                <li>• <span className="text-gray-400 font-mono">10</span> stones per player</li>
                <li>• Capture <span className="text-sol font-mono">4</span> stones to win</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Movement */}
        <section className="glass p-6 space-y-4">
          <h2 className="heading-2 text-white">Movement</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-void-900/60 rounded-lg">
              <span className="text-xl">1️⃣</span>
              <div>
                <p className="text-sm text-white font-medium">Select a piece</p>
                <p className="text-xs text-gray-400">Click one of your stones to see available moves</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-void-900/60 rounded-lg">
              <span className="text-xl">2️⃣</span>
              <div>
                <p className="text-sm text-white font-medium">Slide along a line</p>
                <p className="text-xs text-gray-400">Stones slide any distance along one of the lines passing through them. They cannot jump over other stones.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-void-900/60 rounded-lg">
              <span className="text-xl">🌀</span>
              <div>
                <p className="text-sm text-white font-medium">Lines wrap around!</p>
                <p className="text-xs text-gray-400">Sliding off the right edge brings you to the left. Off the top? You appear at the bottom. The board has no corners or edges — it&apos;s a torus.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Capture */}
        <section className="glass p-6 space-y-4">
          <h2 className="heading-2 text-white">Capture: The Eclipse</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            When your stone <strong className="text-white">lands</strong> and creates a sandwich — your stones
            on both sides of enemy stones along the same line — all the enemy stones in between are captured and removed.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-void-900/60 rounded-lg">
              <span className="text-eclipse-400">✓</span>
              <p className="text-xs text-gray-300">
                <strong className="text-white">A single move can capture on multiple lines</strong> — this is a Total Eclipse!
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-void-900/60 rounded-lg">
              <span className="text-nebula-emerald">✓</span>
              <p className="text-xs text-gray-300">
                <strong className="text-white">Moving INTO a sandwich is safe</strong> — only the stone that just moved triggers captures.
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-void-900/60 rounded-lg">
              <span className="text-nebula-pink">✗</span>
              <p className="text-xs text-gray-300">
                <strong className="text-white">You cannot bracket yourself</strong> — a single stone can&apos;t form both ends of a sandwich.
              </p>
            </div>
          </div>
        </section>

        {/* Winning */}
        <section className="glass p-6 space-y-4">
          <h2 className="heading-2 text-white">Winning</h2>
          <ul className="text-sm text-gray-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-sol">🏆</span>
              First to reach the capture target wins (2 on 3×3, 4 on 5×5)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sol">🚫</span>
              If you can&apos;t move (all stones blocked), you lose
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sol">♾️</span>
              Repeating the same board position is forbidden (Superko rule)
            </li>
          </ul>
        </section>

        {/* Math Note */}
        <section className="glass p-6 space-y-4 border-l-4 border-eclipse-500">
          <h2 className="heading-3 text-eclipse-400">The Mathematics</h2>
          <p className="text-gray-400 text-xs leading-relaxed">
            The board is an <em>Affine Plane AG(2, q)</em> over a Galois Field GF(q).
            For Grahan-3, q=3 (arithmetic mod 3). For Grahan-5, q=5 (arithmetic mod 5).
            Each point has exactly q+1 lines through it. Each line contains exactly q points.
            Lines within the same &ldquo;parallel class&rdquo; (same slope) never intersect.
            Any two distinct points lie on exactly one line. This beautiful mathematical structure
            guarantees perfect symmetry — every point on the board is equivalent.
          </p>
        </section>

        {/* CTA */}
        <div className="text-center space-y-4 pt-8">
          <Link href="/tutorial" className="btn-primary px-8 py-4 text-base mr-4">
            Start Tutorial
          </Link>
          <Link href="/play" className="btn-ghost px-8 py-4 text-base">
            Jump to Game
          </Link>
        </div>
      </div>
    </main>
  );
}
