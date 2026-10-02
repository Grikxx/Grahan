# GRAHAN — Web Frontend

This is the Next.js web application for **GRAHAN**, a two-player abstract strategy game of celestial eclipses and positional strategy.

## Rules of GRAHAN

1. **Board Sizes**: $n \times n$ grids for $n \in \{4, 6, 7, 8, 9, 10\}$.
   - $n = 4$: Rahu (shadow) fills row $y=0$ (4 stones); Surya (sun) fills row $y=3$ (4 stones).
   - $n \ge 6$: Rahu fills rows $y=0$ and $y=1$; Surya fills rows $y=n-2$ and $y=n-1$.
2. **Movement & Passing (Rule N1)**:
   - Pick a stone and slide it any positive distance along an open row, column, or diagonal.
   - At any non-terminal position, the player to move may **pass**. Passing advances the ply counter by 1 and passes the turn.
3. **Eclipse Sandwich Capture**:
   - An unbroken row of enemy stones sandwiched between the mover's landing piece and another friendly piece along any straight ray is captured.
   - Multiple directions can capture in one move.
   - **No self-capture**: landing between two enemy stones is safe.
4. **Positional Superko (Rule N2)**:
   - Moves may not recreate an earlier position $(board, \text{side to move})$.
   - Passes are exempt from Superko and are always legal in non-terminal positions.
5. **Winning Conditions (Rule N3)**:
   - (T1) Reaching the capture target ($n - 1$ stones) wins immediately.
   - (T2) At ply limit $L(n)$ ($100, 200, 250, 300, 350, 400$), the side with more remaining stones wins (equal = draw).
   - No stalemate loss: passing is always legal.

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Open http://localhost:3000 in your browser
```

## Running Tests

From the repository root:

```bash
npm test
```
