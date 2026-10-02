# 🌑 GRAHAN-P (ग्रहण-प) — Grahan with Pass

> **A celestial strategy game on $n \times n$ grids for Discrete Mathematics.**

GRAHAN-P ("Grahan with Pass") is a two-player zero-sum abstract strategy game. Capture enemy stones through custodial ("eclipse sandwich") captures along straight lines and diagonals, or maneuver positionally under positional superko and legal passing.

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
2. **Move**: Pick a stone and slide it any positive distance along an open row, column, or diagonal.
3. **Pass (N1)**: At any non-terminal position, the player to move may pass. A pass changes only the side to move and advances the ply counter by 1.
4. **Eclipse Sandwich**: An unbroken run of enemy stones between the mover's landing stone and another friendly stone is captured. Multiple rays capture simultaneously. No self-capture (landing between two enemy stones does not capture the mover).
5. **Superko (N2)**: A move may not recreate a position $(board, \text{turn})$ that has already occurred in the game. Passes are exempt from Superko. Position history $H$ is a multiset.
6. **Winning (N3 & K1–K5)**:
   - **T1**: Reaching $n-1$ captures wins immediately.
   - **T2**: At ply limit $L(n)$, player with more stones wins (equal = draw).
   - **No stalemate loss**: Passing is always legal in non-terminal positions.

## Testing

```bash
npm test
```
