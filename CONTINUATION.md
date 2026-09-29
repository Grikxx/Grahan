# GRAHAN — Continuation Guide for AI

> **If you are an AI picking up where another AI left off, read this first.**

## Current State (as of completion)

### ✅ COMPLETED
1. **Monorepo structure** — npm workspaces, TypeScript configs
2. **packages/math** — GF(3), GF(5) prime field arithmetic, AG(2,q) affine plane builder with full incidence structure
3. **packages/engine** — GameState types, Zobrist hashing, custodial capture resolver, legal move generator, applyMove, checkGameResult, perft
4. **packages/ai** — Heuristic evaluation, transposition table, Negamax with Alpha-Beta, iterative deepening search
5. **apps/web** — Next.js 16 + Tailwind CSS v4:
   - Landing page with animated star field background, eclipse orb, feature cards
   - Play page with game setup (board size, mode, difficulty) and interactive canvas
   - Tutorial page with 10-step guided walkthrough
   - About page with comprehensive rules
   - GameCanvas component (HTML5 Canvas with glow effects, line highlights, capture animations)
   - useGame hook (state management with React useReducer)
   - Self-contained frontend engine (lib/engine.ts — doesn't require workspace resolution)
6. **Single-Move Win Fix** — Custodial capture brackets runs along line segments within the visible board grid. Toroidal wrapping is preserved for movement, but capture bracketing no longer wraps across the board edges through the back of the universe (which previously caused 8 White stones to be wiped out on Move 1 because rows 0 and 4 touch toroidally).

### ⚠️ PARTIALLY DONE / NEEDS WORK
- **AI Web Worker** — AI runs in setTimeout currently, should move to a proper Web Worker for non-blocking
- **Oracle (Grahan-3 solver)** — Package structure exists but retrograde solver not implemented
- **Backend** — Not started (Express + PostgreSQL + WebSocket)
- **Tests** — Package test structure created but actual test files not written
- **GF(4) support** — Field implementation exists but no AG(2,4) game variant integrated

### ❌ NOT STARTED
- Express/PostgreSQL backend (`apps/server/`)
- WebSocket multiplayer
- User authentication / leaderboard
- Oracle retrograde solver
- Web Worker AI execution
- Property-based tests (vitest + fast-check)
- Perft validation against hardcoded counts
- Sound effects
- Mobile touch optimization
- Production deployment configs (Vercel, Railway/Fly)

---

## Key Files & What They Do

| File | Purpose |
|------|---------|
| `packages/math/src/field.ts` | Galois Field interfaces + GF(p), GF(4) implementations |
| `packages/math/src/affine-plane.ts` | AG(2,q) builder — lines, points, slopes, neighbors |
| `packages/engine/src/types.ts` | GameState, Move, CellState, GameResult types |
| `packages/engine/src/zobrist.ts` | 64-bit Zobrist hashing with deterministic PRNG |
| `packages/engine/src/capture.ts` | Custodial capture resolution (the "Eclipse" mechanic) |
| `packages/engine/src/moves.ts` | Legal move enumeration along cyclic lines |
| `packages/engine/src/state.ts` | createInitialState, applyMove, checkGameResult |
| `packages/engine/src/perft.ts` | Move generation verification via leaf counting |
| `packages/ai/src/evaluate.ts` | Heuristic: stones + captures + mobility + threats |
| `packages/ai/src/transposition.ts` | Zobrist-keyed TT with EXACT/LOWER/UPPER flags |
| `packages/ai/src/negamax.ts` | Iterative deepening Negamax with Alpha-Beta |
| `apps/web/src/lib/engine.ts` | **STANDALONE** frontend engine (all math+engine+ai in one file) |
| `apps/web/src/lib/canvas.ts` | Canvas drawing functions (grid, pieces, lines, effects) |
| `apps/web/src/hooks/useGame.ts` | React game state hook |
| `apps/web/src/components/GameCanvas.tsx` | Interactive canvas component |
| `apps/web/src/components/GameHUD.tsx` | Score display, turn indicator |
| `apps/web/src/app/page.tsx` | Landing page |
| `apps/web/src/app/play/page.tsx` | Game page with setup + play |
| `apps/web/src/app/tutorial/page.tsx` | Interactive tutorial |
| `apps/web/src/app/about/page.tsx` | Rules reference |
| `apps/web/src/app/globals.css` | Tailwind v4 theme + custom CSS |

---

## Architecture Notes

### Why Two Engine Copies?
The `apps/web/src/lib/engine.ts` is a self-contained copy of the math+engine+ai logic because Next.js + npm workspaces can have module resolution issues (especially with `"type": "module"` and `.js` extensions in imports). The canonical packages (`packages/math`, `packages/engine`, `packages/ai`) are the source of truth but the frontend uses its own standalone version for reliability.

If you make changes to game logic:
1. Update the canonical package first
2. Port the changes to `apps/web/src/lib/engine.ts`

### Tailwind v4
This project uses **Tailwind CSS v4** with `@tailwindcss/postcss`. Configuration is CSS-based (`@theme` in `globals.css`), NOT in a `tailwind.config.ts` file. The old-style config file was deleted.

### Game State Design
- States are immutable — `applyMove` returns a new state
- Zobrist hashing uses string encoding in the frontend (for simplicity), BigInt in the packages
- Superko is tracked via Set<string> of hashed positions
- AI runs in main thread via setTimeout (should be moved to Web Worker)

---

## How to Continue

### Priority 1: Backend Setup
```bash
mkdir -p apps/server/src/{routes,ws,db,middleware}
# Set up Express + ws (WebSocket library)
# Schema: users, games, moves, leaderboard tables
# PostgreSQL with pg package
```

### Priority 2: Tests
```bash
# Install fast-check for property-based testing
npm install -D fast-check -w packages/math

# Test files go in packages/*/src/__tests__/
# Key tests:
# - Field axioms (associativity, commutativity, distributivity, inverses)
# - Incidence axioms (unique line through 2 points, parallel postulate)
# - Capture invariants (Seega safety, multi-line capture)
# - Perft counts at depth 1-3
```

### Priority 3: AI Web Worker
```typescript
// apps/web/src/workers/ai.worker.ts
// Use the standalone engine from lib/engine.ts
// Listen for {state, difficulty} messages
// Post back {bestMove} result
```

### Priority 4: Oracle (Grahan-3 Solver)
```typescript
// Backward induction over state space
// ~2.36M reachable states (3^9 × 2 × 60)
// Generate a JSON tablebase mapping state hash → {value, bestMove, dtc}
// Serve as tutorial hints
```

### Priority 5: Polish
- Move animations (interpolated sliding)
- Sound effects (capture, move, win)
- Mobile touch handling
- Loading states and error boundaries

---

## Running the Project

```bash
# Install dependencies from root
cd /path/to/grahan
npm install

# Start dev server
cd apps/web
npm run dev
# → http://localhost:3000

# Build for production
npm run build

# Run tests
cd ../..
npm test
```

## Game Specification Reference
The complete mathematical specification is in the user's original prompt (first message in the conversation). Key constants:

- **GF(3)**: Z_3 arithmetic (mod 3)
- **GF(5)**: Z_5 arithmetic (mod 5)
- **AG(2, 3)**: 9 points, 12 lines, 4 parallel classes
- **AG(2, 5)**: 25 points, 30 lines, 6 parallel classes
- **Capture**: Custodial (sandwich), only triggered by landing piece
- **Superko**: Positional, verified via Zobrist hashing
- **Grahan-3 win**: 2 captures, 60-ply cap with stone majority tiebreaker
- **Grahan-5 win**: 4 captures, no ply cap (superko prevents infinite loops)
