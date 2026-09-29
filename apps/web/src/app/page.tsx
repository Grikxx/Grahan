"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Star Field Background ──────────────────────────────────── */

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const stars: { x: number; y: number; r: number; speed: number; opacity: number; phase: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function init() {
      resize();
      stars.length = 0;
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          r: Math.random() * 1.5 + 0.3,
          speed: Math.random() * 0.3 + 0.05,
          opacity: Math.random() * 0.7 + 0.3,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const star of stars) {
        const twinkle = Math.sin(time * 0.001 * star.speed + star.phase) * 0.3 + 0.7;
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200, 200, 255, ${star.opacity * twinkle})`;
        ctx!.fill();

        // Subtle glow
        if (star.r > 1) {
          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.r * 3, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(167, 139, 250, ${0.05 * twinkle})`;
          ctx!.fill();
        }
      }
      animId = requestAnimationFrame(draw);
    }

    init();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

/* ─── Eclipse Ring Animation ─────────────────────────────────── */

function EclipseOrb() {
  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto my-12">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-eclipse-500/20 via-nebula-blue/10 to-transparent blur-3xl animate-pulse-slow" />
      {/* Ring */}
      <div className="absolute inset-4 rounded-full border-2 border-eclipse-400/30 animate-[spin_20s_linear_infinite]" />
      <div className="absolute inset-8 rounded-full border border-eclipse-500/20 animate-[spin_15s_linear_infinite_reverse]" />
      {/* Core */}
      <div className="absolute inset-12 rounded-full bg-gradient-radial from-void-800 via-void-900 to-void-950 shadow-2xl shadow-eclipse-600/20" />
      {/* Corona */}
      <div className="absolute inset-10 rounded-full border border-sol/20 animate-glow" />
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl md:text-5xl font-display font-bold text-gradient select-none">
          ग्रहण
        </span>
      </div>
    </div>
  );
}

/* ─── Feature Card ───────────────────────────────────────────── */

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div
      className="glass glow-border p-6 space-y-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-3xl">{icon}</div>
      <h3 className="heading-3 text-white">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── Main Landing Page ──────────────────────────────────────── */

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <StarField />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-eclipse-500 to-nebula-blue shadow-lg shadow-eclipse-500/30" />
          <span className="font-display font-semibold text-lg tracking-tight">GRAHAN</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/tutorial" className="btn-ghost text-xs md:text-sm">
            Learn
          </Link>
          <Link href="/play" className="btn-primary text-xs md:text-sm">
            Play
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 section text-center pt-8 md:pt-16">
        <div
          className={`transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-eclipse-400 font-mono text-xs tracking-widest uppercase mb-4">
            Abstract Strategy on Finite Geometry
          </p>
          <h1 className="heading-1 text-white mb-4">
            GRAHAN
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Capture your opponent&apos;s stones through{" "}
            <span className="text-eclipse-300">geometric eclipses</span> on a
            toroidal plane defined by{" "}
            <span className="text-nebula-blue">Galois field arithmetic</span>.
          </p>
        </div>

        <EclipseOrb />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link href="/play" className="btn-primary px-8 py-4 text-base">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start Playing
          </Link>
          <Link href="/tutorial" className="btn-ghost px-8 py-4 text-base">
            How to Play
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="🌀"
            title="Toroidal Topology"
            description="Lines wrap around the board edges. Every point is equal — no corners, no center, no advantage."
            delay={100}
          />
          <FeatureCard
            icon="🌑"
            title="Custodial Capture"
            description="Sandwich enemy stones between yours along geometric lines. One move can trigger captures on multiple lines simultaneously."
            delay={200}
          />
          <FeatureCard
            icon="🧮"
            title="Galois Field Math"
            description="The board is an affine plane AG(2,q) over a finite field. Every line has exactly q points, and q+1 lines pass through every point."
            delay={300}
          />
        </div>
      </section>

      {/* Game Modes */}
      <section className="relative z-10 section">
        <h2 className="heading-2 text-center text-white mb-8">Choose Your Board</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Link
            href="/tutorial"
            className="glass glow-border p-8 text-center group transition-all hover:scale-[1.02] hover:border-eclipse-500/40"
          >
            <div className="text-5xl mb-4">3×3</div>
            <h3 className="heading-3 text-white mb-2">Grahan-3</h3>
            <p className="text-gray-400 text-sm">
              9 points · 12 lines · Tutorial mode
            </p>
            <p className="text-eclipse-400 text-xs mt-2 font-mono">
              Fully solved by The Oracle
            </p>
          </Link>
          <Link
            href="/play"
            className="glass glow-border p-8 text-center group transition-all hover:scale-[1.02] hover:border-sol/40"
          >
            <div className="text-5xl mb-4">5×5</div>
            <h3 className="heading-3 text-white mb-2">Grahan-5</h3>
            <p className="text-gray-400 text-sm">
              25 points · 30 lines · Full game
            </p>
            <p className="text-sol text-xs mt-2 font-mono">
              Against AI or another player
            </p>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-12 text-gray-600 text-xs font-mono">
        <p>GRAHAN · ग्रहण · Eclipse</p>
        <p className="mt-1">Built on discrete mathematics and finite geometry</p>
      </footer>
    </main>
  );
}
