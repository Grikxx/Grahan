# GRAHAN — Continuation Guide for AI

## Current State

### ✅ COMPLETED
1. **Frontend & Celestial Astrolabe Experience**:
   - The celestial astrolabe aesthetic: midnight blues, radiant sun (Surya), glowing shadow moon (Rahu), brass plates, radial rings, and coordinates.
   - Synthesized Web Audio API sound effects (`lib/sound.ts`): wooden slide taps, inharmonic temple-bell eclipse strikes, rising victory phrases.
   - Standalone Web Worker (`public/ai-worker.js`, `workers/ai.worker.ts`, `lib/ai-client.ts`) for non-blocking search computation with main-thread fallback.
   - Interactive `Board` component with crisp canvas rendering, smooth animations, line highlights, danger markers, and hover capture previews.
   - Complete pages: Home (`/`), Play (`/play`), Tutorial (`/tutorial`), Rules (`/about`).
2. **Backend & Engine Rules**:
   - Board sizes **6×6 through 10×10** fully supported (`grahan-6` to `grahan-10`).
   - Starting stones: exactly 2 ranks per player (12 stones each on 6×6, up to 20 on 10×10).
   - Capture targets: `q - 1` (5 captures on 6×6, up to 9 on 10×10).
   - Pieces slide along straight lines (horizontal, vertical, and diagonals) within the board edges `[0, q-1]`.
   - Stones cannot jump over other stones.
   - Positional superko enforced with 64-bit Zobrist hashing.
3. **Gameplay & AI Enhancements (Recent Fixes)**:
   - **Winning Animation**: Full celestial celebration overlay ([`WinningAnimation.tsx`](file:///home/grikxx/Documents/DM2.0/Grahan/apps/web/src/components/WinningAnimation.tsx)) featuring physics-based stardust particle bursts, expanding astrolabe shockwaves, stone emblem halo glows, and victory stat cards for both human and AI victories.
   - **Custodial Interposition Capture**: Implemented custodial interposition capture ([`rules.ts`](file:///home/grikxx/Documents/DM2.0/Grahan/packages/engine/src/rules.ts), [`ai.ts`](file:///home/grikxx/Documents/DM2.0/Grahan/packages/engine/src/ai.ts)). When a player slides their stone directly between two enemy stones without a gap, it is immediately captured by the opponent.
   - **Distinct AI Difficulty Tiers**:
     - **Easy**: Depth 1, no tactical quiescence reading (`qDepth: 0`), 28% blunder rate, high evaluation noise.
     - **Medium**: Depth 3, shallow quiescence reading (`qDepth: 2`), 4% blunder rate, modest evaluation noise.
     - **Hard**: Depth 16, full deep quiescence reading (`qDepth: 4`), 0 blunder rate, 0 noise for master-level tactical play.
   - **High-Accuracy Hints**: Dedicated `HINT_OPTIONS` with depth 10, full quiescence search, and zero noise. Enhanced board visuals with glowing origin beacon rings, directional trails, destination target markers, and clear hint status guidance. Hints automatically clear upon selecting another piece.
    - **Turn Counter & Turn Limits**:
      - Explicit turn limits for all board sizes: 6×6 (100 turns), 7×7 (125 turns), 8×8 (150 turns), 9×9 (175 turns), 10×10 (200 turns).
      - Celestial Turn Counter ([`TurnCounter.tsx`](file:///home/grikxx/Documents/DM2.0/Grahan/apps/web/src/components/TurnCounter.tsx)) showing turn number, progress bar, remaining turns, and phase progression.
4. **Tests and Builds**:
   - 25 engine tests passing cleanly (`npm test`).
   - Rebuilt Web Worker (`public/ai-worker.js`).
   - Production Next.js build (`npm run build`) generates all static pages with zero errors.
