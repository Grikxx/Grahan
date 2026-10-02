# 🌑 GRAHAN (ग्रहण)

> **A mathematical strategy game on affine planes over Galois Fields.**

GRAHAN ("Eclipse" in Sanskrit) is a 2-player zero-sum abstract strategy game played on finite geometric structures. Capture your opponent's stones through custodial ("sandwich") captures along geometric lines on a toroidal board.

## Quick Start

```bash
# From the repository root
cd grahan

# Install dependencies
npm install

# Start the web app
cd apps/web
npm run dev
# → http://localhost:3000
```

## Project Structure

```
grahan/
├── packages/
│   ├── math/          # Galois Fields (GF(3), GF(5)) + Affine Plane AG(2,q)
│   ├── engine/        # Game state, moves, custodial capture, Zobrist hashing
│   └── ai/            # Negamax + Alpha-Beta pruning, transposition table
├── apps/
│   └── web/           # Next.js 16 + Tailwind CSS v4 frontend
└── package.json       # npm workspaces root
```

## Game Rules (TL;DR)

1. **Board:** A q×q grid where all lines wrap around (torus topology)
2. **Move:** Slide a stone along any geometric line to an empty point (no jumping)
3. **Capture:** When your stone lands and sandwiches enemy stones between yours along a line, those enemies are captured
4. **Win:** Capture enough stones or trap your opponent

## Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, HTML5 Canvas
- **Game Engine:** TypeScript (pure functional, immutable state)
- **AI:** Iterative Deepening Negamax with Alpha-Beta pruning
- **Rendering:** Custom Canvas renderer with glow effects, line highlights, wrap arrows

## Pages

- `/` — Landing page with star field animation
- `/tutorial` — Interactive 10-step tutorial on 3×3 board
- `/play` — Full game with AI opponent or local PvP
- `/about` — Complete rules reference

## Development

```bash
# Run tests
npm test

# Build for production
cd apps/web && npm run build
```

## Mathematics

The board is an **Affine Plane AG(2, q)** over the Galois Field GF(q). Key properties:
- q² points, q(q+1) lines
- q+1 lines through every point, q points on every line
- Perfect symmetry: every point is equivalent (vertex-transitive)
- Lines come in q+1 "parallel classes" — lines of the same slope never intersect


