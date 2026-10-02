# 🌑 GRAHAN (ग्रहण)

> **A celestial strategy game of shadows and suns on $n \times n$ grids for Discrete Mathematics.**

GRAHAN is a two-player zero-sum abstract strategy game. Capture enemy stones through custodial ("eclipse sandwich") captures along straight lines and diagonals, or maneuver positionally under positional superko and legal passing.

## Quick Start

```bash
# From repository root
npm install

# Run all test suites
npm test

# Run Next.js web application
npm run dev --prefix apps/web
# → http://localhost:3000
```

## Board Variants

| Variant | Grid | Stones/Side | Rows per Side | Capture Target | Ply Limit $L(n)$ | Max Turns |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Grahan-4** | 4 × 4 | 4 | 1 (y=0 / y=3) | 3 | 100 | 50 |
| **Grahan-6** | 6 × 6 | 12 | 2 (y=0,1 / y=4,5) | 5 | 200 | 100 |
| **Grahan-7** | 7 × 7 | 14 | 2 (y=0,1 / y=5,6) | 6 | 250 | 125 |
| **Grahan-8** | 8 × 8 | 16 | 2 (y=0,1 / y=6,7) | 7 | 300 | 150 |
| **Grahan-9** | 9 × 9 | 18 | 2 (y=0,1 / y=7,8) | 8 | 350 | 175 |
| **Grahan-10** | 10 × 10 | 20 | 2 (y=0,1 / y=8,9) | 9 | 400 | 200 |

## Core Rules

1. **Rahu & Surya**: Rahu (dark shadow) moves first; Surya (radiant sun) moves second.
2. **Move**: Pick a stone and slide it any positive distance along an open row, column, or diagonal. No jumping, no landing on an occupied square.
3. **Pass**: At any non-terminal position, the player to move may pass. A pass changes only the side to move and advances the ply counter by 1.
4. **Eclipse Sandwich**: An unbroken run of enemy stones between the mover's landing stone and another friendly stone is captured. Multiple rays capture simultaneously. No self-capture (landing between two enemy stones is safe).
5. **Superko**: A move may not recreate an earlier position $(board, \text{turn})$ that has already occurred in the game. Passes are exempt from Superko. Position history $H$ is a multiset.
6. **Winning Conditions**:
   - **T1**: Reaching $n-1$ captures wins immediately.
   - **T2**: At ply limit $L(n)$, player with more stones wins (equal = draw).
   - **No stalemate loss**: Passing is always legal in non-terminal positions.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, HTML5 Canvas
- **Game Engine:** TypeScript (pure functional, immutable state)
- **AI:** Iterative Deepening Negamax with Alpha-Beta pruning, transposition table, Web Worker background execution
- **Rendering:** Custom Canvas renderer with glow effects, line highlights, move animations

## Pages

- `/` — Landing page with interactive live demonstration
- `/tutorial` — Step-by-step interactive tutorial
- `/play` — Full game with AI opponent or local PvP
- `/about` — Complete rules reference

## Development & Testing

```bash
# Run tests
npm test

# Build for production
npm run build
```
