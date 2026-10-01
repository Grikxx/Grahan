# GRAHAN — Continuation Guide for AI

## Current State

### ✅ COMPLETED
1. **Frontend copied from folder 2 into grahan**:
   - The celestial astrolabe aesthetic: midnight blues, radiant sun (Surya), glowing shadow moon (Rahu), brass plates, radial rings, and coordinates.
   - Synthesized Web Audio API sound effects (`lib/sound.ts`): wooden slide taps, inharmonic temple-bell eclipse strikes, rising victory phrases.
   - Standalone Web Worker (`public/ai-worker.js`, `workers/ai.worker.ts`, `lib/ai-client.ts`) for non-blocking search computation with main-thread fallback.
   - Interactive `Board` component with crisp canvas rendering, smooth animations, line highlights, danger markers, and hover capture previews.
   - Complete pages: Home (`/`), Play (`/play`), Tutorial (`/tutorial`), Rules (`/about`).
2. **Backend / Engine changes applied as requested**:
   - `3×3`, `4×4`, and `5×5` removed from the game.
   - Board sizes **6×6 through 10×10** fully supported (`grahan-6` to `grahan-10`).
   - Starting stones: exactly 2 ranks per player (12 stones each on 6×6, up to 20 on 10×10).
   - Capture targets: `q - 1` (5 captures on 6×6, up to 9 on 10×10).
   - **Move & capture mechanics strictly bounded**:
     - Pieces slide along straight lines (horizontal, vertical, and diagonals) within the board edges `[0, q-1]`.
     - **NO WRAPPING** around board edges.
     - Stones cannot jump over other stones.
     - Custodial capture occurs along straight lines and diagonals strictly inside grid bounds.
     - Positional superko enforced with 64-bit Zobrist hashing.
   - Tutorial updated to explain game rules using the **6×6** board.
3. **Tests and Builds**:
   - 19 engine tests passing cleanly (`npm test`).
   - `npx tsc --noEmit` clean with zero errors.
   - Production Next.js build (`npm run build`) generates all static pages with zero errors.
