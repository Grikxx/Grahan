"use client";

import { useEffect, useRef } from "react";
import { RAHU, SURYA, playerName, type Player } from "@grahan/engine";
import StoneIcon from "./StoneIcon";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
  isStar?: boolean;
}

interface WinningAnimationProps {
  winner: Player | null;
  opponent: "computer" | "friend";
  human: Player;
  reason: string;
  captures: number;
  target: number;
  ply: number;
  maxTurns?: number;
  onRematch: () => void;
  onChangeSetup: () => void;
}

export default function WinningAnimation({
  winner,
  opponent,
  human,
  reason,
  captures,
  target,
  ply,
  maxTurns,
  onRematch,
  onChangeSetup,
}: WinningAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isHumanWinner = opponent === "computer" ? winner === human : true;
  const winnerName = winner ? playerName(winner) : "";
  const isSurya = winner === SURYA;

  // Title calculation
  let title = "Game Drawn";
  let subtitle = "Balance in the heavens remains unbroken";
  if (winner) {
    if (opponent === "computer") {
      if (winner === human) {
        title = "Victory!";
        subtitle = isSurya ? "You have dispelled the shadows of Rahu" : "You have eclipsed the solar radiance";
      } else {
        title = "Defeat";
        subtitle = isSurya ? "Surya's radiant solar storm prevails" : "Rahu's shadow swallows the cosmos";
      }
    } else {
      title = `${winnerName} Triumphs!`;
      subtitle = isSurya ? "The Sun claims dominion over the celestial field" : "The Shadow Moon claims the eclipse";
    }
  }

  // Particle explosion & ambient sparkles on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !winner) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const suryaColors = ["#FFF2C4", "#F6B93B", "#FFA93B", "#D8B46A", "#FF764A"];
    const rahuColors = ["#B9C8F5", "#8FB3FF", "#6C5CE7", "#D8B46A", "#E4EBF5"];
    const colors = isSurya ? suryaColors : rahuColors;

    const particles: Particle[] = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 2 + Math.random() * 7.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 2.5 + Math.random() * 4.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.95 + Math.random() * 0.05,
        decay: 0.005 + Math.random() * 0.008,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.15,
        isStar: Math.random() > 0.4,
      });
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime) / 16.66;
      lastTime = now;

      ctx.clearRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.08 * dt; // subtle gravity
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.alpha -= p.decay * dt;
        p.rotation += p.vRot * dt;

        if (p.alpha <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.isStar) {
          // Draw four-pointed twinkle star
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.3, -s * 0.3);
          ctx.lineTo(s, 0);
          ctx.lineTo(s * 0.3, s * 0.3);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.3, s * 0.3);
          ctx.lineTo(-s, 0);
          ctx.lineTo(-s * 0.3, -s * 0.3);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Add gentle ambient rising sparkles
      if (Math.random() < 0.25 && particles.length < 180) {
        particles.push({
          x: Math.random() * rect.width,
          y: rect.height + 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.5 - Math.random() * 2,
          size: 2 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.8,
          decay: 0.007 + Math.random() * 0.005,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.1,
          isStar: true,
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [winner, isSurya]);

  return (
    <div className="victory-overlay" role="dialog" aria-labelledby="victory-title">
      <canvas ref={canvasRef} className="victory-canvas" aria-hidden="true" />

      <div className="victory-card-wrap">
        {/* Expanding Astrolabe Shockwave Rings */}
        <div className={`victory-shockwave ${isSurya ? "shockwave-sun" : "shockwave-moon"}`} aria-hidden="true">
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
        </div>

        <div className="victory-card">
          {/* Header pill badge */}
          <div className="victory-badge">
            <span className="badge-glow" />
            <span className="badge-text">{winner ? (isHumanWinner ? "VICTORY ACHIEVED" : "GAME CONCLUDED") : "DRAW"}</span>
          </div>

          {/* Animated Winner Stone Emblem */}
          {winner && (
            <div className="victory-emblem-wrap my-4">
              <div className={`emblem-halo ${isSurya ? "halo-sun" : "halo-moon"}`} />
              <div className="emblem-stone">
                <StoneIcon who={winner} size={72} />
              </div>
            </div>
          )}

          <h2 id="victory-title" className="victory-title">
            {title}
          </h2>
          <p className="victory-subtitle">{subtitle}</p>

          <p className="victory-reason">{reason}</p>

          {/* Celestial Stat Badges */}
          <div className="victory-stats">
            <div className="stat-pill">
              <span className="stat-label">Captures</span>
              <span className="stat-val">{captures} / {target}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Turns</span>
              <span className="stat-val">{maxTurns ? `${Math.floor(ply / 2)} / ${maxTurns}` : Math.floor(ply / 2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button className="btn btn-brass victory-btn-primary" onClick={onRematch} autoFocus>
              Play again
            </button>
            <button className="btn btn-line" onClick={onChangeSetup}>
              Change setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
