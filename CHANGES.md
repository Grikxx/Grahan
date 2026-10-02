# CHANGES.md — GRAHAN-P ("Grahan with Pass") Implementation

## 1. Specification Mapping Table

The following table maps every specification item (Rules N1–N3 and Clarifications K1–K5) to the exact source files and functions where it is implemented, along with the automated tests covering it:

| Spec Item | Description | Implementation File(s) & Function(s) | Test Name(s) in Test Suite |
| :--- | :--- | :--- | :--- |
| **N1** | Passing is legal in any non-terminal position; moves nothing, captures nothing, advances ply by 1, flips turn; runs terminal checks T1 & T2 | `packages/engine/src/rules.ts`:<br>• `PASS`, `Pass`, `Action`, `isPass()`<br>• `applyPass()`<br>• `applyAction()`<br>• `legalActions()`<br>• `isLegal()`<br>• `outcome()`<br>`packages/engine/src/ai.ts`:<br>• `Searcher.run()` (handles pass actions)<br>`apps/web/src/hooks/useGrahan.ts`:<br>• `pass()` callback and reducer action `{ type: "pass" }`<br>`apps/web/src/app/play/page.tsx`:<br>• "Pass" control button & move log | • `A1. Initial position legal moves and actions for Rahu across all board sizes`<br>• `B1. All-pass game ends exactly at L(n) as a DRAW, H has exactly 2 distinct positions`<br>• `B3. A pass changes nothing except side to move and ply counter; it never captures`<br>• `B5. Pass is legal at ply 0 and at ply L(n) (ends game via T2)`<br>• `C1. Random legal actions until terminal satisfy game invariants` |
| **N2** | Positional Superko applies to moves only; passes are exempt; position history $H$ is a multiset | `packages/engine/src/rules.ts`:<br>• `GameState.seen` (`ReadonlyMap<number, number>`)<br>• `addHistory()`, `decrementHistory()`, `cloneHistory()`<br>• `legalMoves()` (verifies `(state.seen.get(k) ?? 0) === 0`)<br>• `applyPass()` (unconditionally records resulting position to $H$)<br>• `applyMove()` (records resulting position to $H$)<br>`packages/engine/src/ai.ts`:<br>• `make()`, `unmake()` multiset tracking | • `B1. All-pass game ends exactly at L(n) as a DRAW, H has exactly 2 distinct positions`<br>• `B2. Examples E1, E2, E3 from Section 3` (E1: consecutive passes; E2: move rejected by pass-created state; E3: move rejected by initial state)<br>• `B6. Take-back / undo / unmake: multiset counts restore correctly`<br>• `C1. Random legal actions (invariant iv: no MOVE ever creates a position already in H)` |
| **N3** | Delete "no legal move loses" rule; player is never without a legal action in non-terminal states | `packages/engine/src/rules.ts`:<br>• `outcome()` (stalemate check omitted for `ruleset === "grahan-p"`)<br>• `legalActions()` (returns `[...legalMoves, PASS]`)<br>`apps/web/src/hooks/useGrahan.ts`:<br>• AI passes when no geometric moves exist<br>`apps/web/src/app/play/page.tsx`:<br>• Status text never displays "has no moves" or "trapped" | • `B4. No stalemate in GRAHAN-P; pass is the only legal action and game continues. Under 'original' it is a loss` |
| **K1** | Position = (board, side to move) | `packages/engine/src/rules.ts`:<br>• `hashBoardWithTurn(board, turn, q)`<br>• `positionKey()`<br>`packages/engine/src/ai.ts`:<br>• `zobristKey` incorporates `zTurn` (side to move) | • `B1. All-pass game (H contains exactly 2 distinct positions: initial + Rahu, initial + Surya)`<br>• `B2. Examples E1, E2, E3`<br>• `Superko: board repetition requires same side to move` |
| **K2** | Ply = 1 action by 1 player; $L(n)$ counts plies; pass is a ply; last ply played by Surya | `packages/engine/src/rules.ts`:<br>• `applyPass()` (`ply: state.ply + 1`)<br>• `applyMove()` (`ply: state.ply + 1`)<br>• `VARIANTS` ($L(n) \in \{100, 200, 250, 300, 350, 400\}$, all even) | • `B1. All-pass game ends exactly at ply L(n)`<br>• `A3. Terminal vectors (limit-win, limit-lose, limit-draw)`<br>• `B5. Pass is legal at ply L(n) (ends game via T2)`<br>• `C1. Random legal actions (ends at or before L(n))` |
| **K3** | Check order after EVERY ply: (T1) target reached -> immediate win; (T2) ply limit reached -> stone count comparison (more wins, equal = draw) | `packages/engine/src/rules.ts`:<br>• `outcome()` (executes T1 target check, then T2 ply limit check)<br>• `isTerminal()` | • `A3. Terminal vectors (target, limit-win, limit-lose, limit-draw)`<br>• `B5. Pass at ply L(n) ends game via T2`<br>• `C1. Final result agrees with K3 and stone counts` |
| **K4** | Total captures = (stones per side) - (opponent's stones on board) | `packages/engine/src/rules.ts`:<br>• `totalCaptures()`<br>• `outcome()` | • `A3. Terminal vectors (target)`<br>• `C1. Stone count monotonicity & non-increasing invariant`<br>• `C2. Fortress property (opponent has captured 0 stones)` |
| **K5** | Superko compares against EVERY earlier position in $H$, including initial position | `packages/engine/src/rules.ts`:<br>• `newGame()` initializes `seen` with initial board & Rahu to move<br>• `legalMoves()` checks against all keys in `seen` | • `B2. Examples E1, E2, E3`<br>• `C1. Invariant iv (no move creates an earlier position)` |

---

## 2. Discrepancies in Existing Code vs. Section 1 (Original Rules)

Prior to implementing GRAHAN-P, the codebase was thoroughly audited against Section 1 of the specification. The following discrepancies were identified and resolved:

1. **Missing 4 × 4 Board Variant (`grahan-4`)**:
   - *Spec (Section 1)*: Board sizes $n \in \{4, 6, 7, 8, 9, 10\}$. Setup for $n=4$: Rahu fills row $y=0$ (4 stones), Surya fills row $y=3$ (4 stones). Target = 3, Ply limit = 100.
   - *Old Code*: Only `grahan-6` through `grahan-10` existed in `VARIANTS`.
   - *Action Taken*: Added `"grahan-4"` to `VariantId` and `VARIANTS` with $q=4$, stones = 4, captureTarget = 3, maxPly = 100, maxTurns = 50. Updated `newGame` to initialize 1 row per player for $n=4$ (rows $y=0$ and $y=3$). Added 4×4 selection to UI dropdowns.

2. **Self-Capture ("Custodial Interposition Capture") Discrepancy**:
   - *Spec (Section 1 & 5)*: "No self-capture: a stone that lands between two enemy stones is NOT captured." Confirmed by Section 5 test A2 `(noself)`: *"Rahu moves (1,1)->(1,3), landing between two Surya stones. Nothing is captured and the Rahu stone stays at (1,3)."* Also critical for the Fortress Property in tests C2–C4.
   - *Old Code*: A function `findInterpositionCaptures` had been introduced in the engine and AI, causing a stone that slid between two enemy stones to be destroyed.
   - *Action Taken*: Completely removed `findInterpositionCaptures` from `applyMove`, `keyAfter`, move legality generation, and AI search evaluation. Captures are strictly active sandwiches closed by the mover's landing piece, with zero self-capture.

3. **Superko Position History as Set vs. Multiset**:
   - *Spec (Section 3, N2)*: Position history $H$ must be a multiset (position key $\to$ count), because passing can legally recreate earlier positions. Undo / take-back / search unmake must decrement counts and only delete entries at zero.
   - *Old Code*: `seen` was implemented as a simple `Set<number>`.
   - *Action Taken*: Replaced `seen: Set<number>` with `seen: ReadonlyMap<number, number>`. Added immutable helper functions `addHistory`, `decrementHistory`, and `cloneHistory`. Ordinary moves are prohibited if target position count $> 0$ in $H$, while passes are exempt from superko checks and increment the multiset count.

4. **Stalemate Loss ("No legal move loses")**:
   - *Spec (Section 3, N3)*: In GRAHAN-P, passing is always legal in non-terminal positions. Therefore, a player is never without a legal action.
   - *Old Code*: If `legalMoves(state).length === 0`, `outcome()` declared the side to move as lost with reason `"trapped"`.
   - *Action Taken*: For GRAHAN-P (default ruleset), removed the trapped/stalemate loss check. In addition, an optional `Ruleset` setting (`"grahan-p"` vs `"original"`) was added so the engine can support both the new specification (default) and exact legacy behavior when configured.

---

## 3. Ambiguities Resolved

The following design decisions and interpretations were made in strict adherence to the specification:

1. **Multiset Key Representation**:
   - *Choice*: Used 32-bit Zobrist hashes combined with player turn bit (`turn << 30 | (zobrist & 0x3fffffff)`) stored as keys in a JavaScript `Map<number, number>`. This provides $O(1)$ lookups, supports accurate multiset counts across passes, and allows fast clone/undo operations.
2. **Move vs. Action Nomenclature**:
   - *Choice*: Maintained `Move` as a geometric slide `{ from, to, lineId, dir }`, and introduced `Pass` (`{ type: "pass" }`), `PASS` singleton, and `Action = Move | Pass`. Functions `legalMoves()` returns geometric moves, while `legalActions()` returns all legal actions (including `PASS` in non-terminal GRAHAN-P states).
3. **Serialization & Backward Compatibility**:
   - *Choice*: In `Snapshot`, kept `seen: number[]` for backward compatibility with legacy saves, while adding `historyCounts?: [number, number][]` and `ruleset?: Ruleset`. Move notation records passes as `"pass"`. When deserializing legacy files lacking history counts, each seen key is initialized with count 1.
4. **AI Policy Regarding Passing**:
   - *Choice*: In accordance with Section 6, the search engine lists `PASS` as legal whenever the game is active. The AI evaluation assigns passing a neutral/slight non-preference over active constructive moves, preventing infinite pass loops between bots while ensuring bots can pass when trapped or strategically advantageous.

---

## 4. Unimplemented Items / Obstacles

**None.** Every requirement from Sections 1, 2, 3, 5, and 6 was implemented to the letter. All automated test cases (A1–A3, B1–B7, C1–C4) pass cleanly without modification or weakening.

---

## 5. Walkthrough

### How to Start a Game
1. Launch the web application:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/play`.
3. In the setup panel:
   - Select the desired board size: **4×4** (`grahan-4`), **6×6**, **7×7**, **8×8**, **9×9**, or **10×10**.
   - Select the opponent mode: **Human vs Human**, **Play vs AI** (Rahu or Surya), or **AI vs AI**.
   - Choose AI difficulty (**Apprentice**, **Adept**, **Master**).
4. Click **Start Match**.

### How to Pass
1. During your turn (when the game is active), locate the **Pass** button located in the board controls bar next to the game status badge.
2. Click **Pass**.
3. Passing will:
   - Keep all stones in their current positions.
   - Advance the ply counter by 1.
   - Flip the turn to the opponent.
   - Add `"pass"` to the Move Log.
   - Evaluate terminal conditions (T1 capture target, T2 ply limit).

### How to Run the Tests
To run the complete automated test suite (including all regression tests and the full GRAHAN-P specification test suite):
```bash
npm test
```
To run only the GRAHAN-P specification test suite:
```bash
npx vitest run packages/engine/src/__tests__/grahan_p.test.ts
```
