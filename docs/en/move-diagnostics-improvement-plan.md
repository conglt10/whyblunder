# Move Diagnostics: Flexibility & Adaptability Improvement Plan

Scope: the move-diagnosis path shared by **Analysis mode** (`js/browser-analyzer.js`) and
**Coach mode** (`js/coach-manager.js`), plus the modules they both lean on
(`js/chess-evaluator.js`, `js/situation-recognizer.js`, `js/opening-detector.js`).

Goal: make the diagnosis *adapt* to the position (phase, sharpness, severity, search
reliability) and to the *player* (coach persona / recurring error themes), instead of
running one fixed geometric ladder and one fixed set of thresholds everywhere.

---

## 1. How it works today

```
                      Analysis mode                     Coach mode
                 (browser-analyzer.js)              (coach-manager.js)
                          |                                 |
     pool.evaluate(fenBefore, depth 18, MultiPV 3)   _evaluatePosition(fen, 12, 3)
     pool.evaluate(fenAfter,  depth 16, MultiPV 1)   _evaluatePosition(fen, 12, 1)
                          |                                 |
                          +---------> ChessEvaluator.cpToWinProb
                          +---------> ChessEvaluator.classifyMove(wpBefore, wpAfter, {playedIsBest, isBook})
                          |                                 |
             SituationRecognizer.explainBlunderOrMistake  /  .explainGoodMove
                          |
              { explanation, tags[], flaw, missedChance, betterLine }
```

`explainBlunderOrMistake` (`js/situation-recognizer.js:1283`) is a ~500-line, fixed-priority
ladder: **Part A** (A1…A17) finds one reason the engine's move was better, **Part B** (B1…B3)
finds one flaw in the played move / one effect of the refutation, **Part C** picks one of six
sentence templates. First detector that fires wins; nothing is ranked or cross-checked.

---

## 2. Findings

### F1 — Two independent pipelines that disagree
`browser-analyzer.js:560-635` and `coach-manager.js:925-1125` each re-implement
*evaluate → classify → explain* with different parameters:

| | Analysis | Coach |
|---|---|---|
| pre-move search | depth 18, MultiPV 3 | depth 12, MultiPV 3 |
| post-move search | depth 16, MultiPV 1 | depth 12, MultiPV 1 |
| MultiPV scan for played move | lines 2–3 | lines 1–5 |
| book window | ply ≤ 16 | ply ≤ 12 |
| best-move selection | raw `bestMove` | `_findVerifiedBestMove` (re-verified, MultiPV 5) |

The same position reviewed in the two modes can get two different verdicts. Coach additionally
short-circuits: `coach-manager.js:919` labels a move `best` with **zero evaluation** whenever it
matches `lastSuggestedMove` or a cached verified best — so a stale suggestion can whitewash a move
that is no longer best.

### F2 — Documented classifications are unreachable
`classifyMove` accepts `isSacrifice`, `isOnlyMove`, `mateMissed`
(`js/chess-evaluator.js:86-88`), but **no call site ever passes them**
(`browser-analyzer.js:567`, `coach-manager.js:1002` both pass only `{playedIsBest, isBook}`).
Consequences: `brilliant` and `great` are dead code although the README documents them, and
`missed win` can only be reached through the win-probability heuristic, never from an actual
missed forced mate that the engine found.

### F3 — Thresholds are absolute and context-blind
The 0.04 / 0.10 / 0.22 WP-loss bands are applied identically to a razor-sharp middlegame and a
dead-drawn rook endgame, to a depth-12 coach search and a depth-18 analysis search, and to an
800-Elo and a 2200-Elo opponent. Nothing accounts for position sharpness (how many replies are
near-best), phase, or search reliability.

### F4 — Explanation ladder is first-match-wins with no confidence
`situation-recognizer.js:1345-1590` walks A1→A17 / B1→B3 and stops at the first hit. There is no
candidate scoring, no confidence value, no evidence cross-check against the engine's own eval
delta, and no way to combine two facts. An *incidental* geometric fork created by the engine's
move outranks the move's real point, and the narrative asserts it with full confidence.

### F5 — Detectors are geometric; there is no SEE
`isPieceSafe` (`situation-recognizer.js:228`) approximates exchange safety with
"min attacker value" + "attacker count vs defender count". No real static exchange evaluation,
no x-ray/battery handling, and pinned defenders still count as defenders.
`detectHangingPieceBlunder` (`:863`) flags any moved piece attacked by a cheaper attacker, even
when the exchange is sound or the move is a deliberate sacrifice, and never checks whether the
engine's refutation actually captures that piece.

### F6 — Language doesn't scale with severity or alternative spread
The Part-C templates (`situation-recognizer.js:1738-1770`) say *"was much better"* for a 0.05
inaccuracy and for a missed mate-in-1 alike. MultiPV data is already fetched but never used to
distinguish *"several moves held; X was one of them"* from *"X was the only move"*.

### F7 — `explainGoodMove` is engine-blind
Both call sites (`browser-analyzer.js:620`, `coach-manager.js:1108`) pass only boards + SAN +
`isBest` — no score, no PV, no MultiPV spread, no threat that was parried. So praise is always
positional boilerplate ("develops the Knight to an active square") even when the move was the
only defence holding a draw. Roughly 80% of plies in a game take this path, so this is where most
of the perceived "dumbness" lives.

### F8 — No game-phase awareness
There is no `gamePhase()` helper anywhere in the codebase. "Development", "center control" and
castling reasons can fire in a bare-rook endgame. Endgame vocabulary (king activity, opposition,
rook behind the passer, pawn races, fortress) is absent apart from a primitive
`detectPassedPawn`.

### F9 — Opening knowledge is tiny and brittle
`js/opening-detector.js` holds 37 hardcoded lines; `isBookMove` is prefix matching, so for most
real games it stops firing by ply 4–10 regardless of the ply-16 cap.
`detectOpeningPrincipleViolation` has exactly two rules and mislabels legitimate retreats and
repositioning as "moving the same piece twice".

### F10 — Coach mode has no learner model
The coach never aggregates recurring error themes across a game.
`_getContextualChallenge` (`coach-manager.js:1779`) branches on two hardcoded board facts;
`generateHint` (`:1825`) falls back to `legalMoves[0]` and — at `:1846-1854` — announces
*"You have a tactical capture available!"* for **any** capture of a N/B/R/Q without checking
whether that capture loses material. Persona affects engine Elo and voice lines only: an 800-Elo
persona and a 2200-Elo persona produce byte-identical diagnostic content.

### F11 — Fixed search budget
Depths are hardcoded throughout (`browser-analyzer.js` 18/16; `coach-manager.js:931,996,1320,1472,1517`
at 12/8/10). No complexity-based or time-based adaptation, and crucially no re-search when a
classification lands near a threshold boundary — exactly the case where two more plies would flip
the verdict.

### F12 — Test harness is not runnable as checked in
`test_browser_modules.js:483` hardcodes `/home/king/code/whyblunder/index.html`, so
`node test_browser_modules.js` fails on any other machine. With that one path patched, the whole
suite passes today — that is our regression baseline.

---

## 3. Plan

Six phases, ordered so each lands independently and keeps the suite green. Phases 1–2 carry the
most behavioural payoff; 0 unblocks everything.

### Phase 0 — Make diagnostics testable *(small, do first)*
1. Fix `test_browser_modules.js:483` to `path.join(__dirname, 'index.html')`.
2. Add `test_diagnostics.js`: a table of ~30 FEN + played-move + *expected tags / expected
   classification* fixtures covering hanging pieces, sound sacrifices, only-moves, missed mates,
   quiet prophylaxis, and endgame conversions — with **stubbed engine output** (hand-written
   `{lines: {...}}` objects), so the corpus runs in Node with no Stockfish and no flakiness.
3. Add a "phrasing audit" assertion set: no explanation may contain a doubled clause, an empty
   `${bestReason}`, or the word "development" when `gamePhase === 'endgame'`.

*Exit:* `node test_browser_modules.js && node test_diagnostics.js` green from a clean clone.

### Phase 1 — Extract a shared `MoveDiagnostics` core *(fixes F1, F2)*
New module `js/move-diagnostics.js` (UMD, same pattern as the others), exposing:

```js
MoveDiagnostics.diagnose({
  fenBefore, fenAfter, playedMove,
  engine: {                       // mode-agnostic engine evidence
    bestUci, lines,               // MultiPV lines keyed 1..N
    postLines,                    // post-move search (refutation)
    depthPre, depthPost
  },
  context: { ply, sanHistory, phase, playerElo, mode: 'analysis' | 'coach' }
}) -> {
  classification: { uiQuality, detailedQuality, wpLoss, confidence },
  narrative:      { explanation, flaw, missedChance, betterLine, tags[] },
  evidence:       [ { kind, claim, confidence, source } ]   // for debugging / UI hover
}
```

- `browser-analyzer.js:560-635` and `coach-manager.js:925-1125` are reduced to *gathering engine
  evidence* and calling `diagnose`; all classification and narration live in one place.
- Derive and pass the currently-dead options: `isOnlyMove` (from MultiPV spread — line 1 beats
  line 2 by a large margin, or only one legal move), `isSacrifice` (material given up in the PV
  that the engine still scores well — reuse `detectMaterialGainInPv` inverted), `mateMissed`
  (`lines[1].mate > 0` while the played move's score has no mate). This revives `brilliant`,
  `great` and true `missed win`.
- Delete Coach's unevaluated `wasSuggested → 'best'` shortcut (`coach-manager.js:919`); keep the
  *voice* reward ("you played what I suggested"), but let the real classification come from
  `diagnose`, with `wasSuggested` passed through as `context` for phrasing only.

*Risk:* this is the largest refactor. Mitigate by landing `move-diagnostics.js` first as a thin
wrapper that delegates to the existing functions (pure move, no behaviour change, suite stays
green), then migrating logic into it phase by phase.

### Phase 2 — Evidence-ranked narration instead of a fixed ladder *(fixes F4, F6, F7)*
Restructure `explainBlunderOrMistake` / `explainGoodMove` into three separable stages:

1. **Collect** — run *all* detectors, each returning
   `{ kind, subject, square, text, weight, confidence }` rather than the first one winning.
   The existing A1…A17 / B1…B3 bodies become detector functions; the ladder disappears.
2. **Rank & corroborate** — score each candidate by
   `weight × confidence × engineAgreement`, where `engineAgreement` checks the claim against the
   engine's own numbers: a "wins the Queen" claim must be backed by a cp swing of roughly queen
   size; a "hanging piece" claim must match the refutation's actual capture square. Claims that
   contradict the engine are demoted, not printed. Surviving claims carry a confidence the UI can
   use (and that gates hedged wording: *"looks like"* vs *"loses"*).
3. **Compose** — a phrase bank keyed by `(severity band, phase, confidence, claim kind)`:
   - severity scales the verb: `0.04` → *"was a touch more accurate"*, `0.22+` → *"was winning"*,
     missed mate → *"ends the game on the spot"*;
   - MultiPV spread scales the framing: if lines 1–3 are within ~0.3 pawns, say
     *"one of several good options"*; if line 1 dominates, say *"the only move"*;
   - a small rotation of equivalent templates per bucket, seeded by `ply` so output stays
     deterministic (the repo already values determinism — see commit `87a25df`) while not reading
     identically on every move.

Give `explainGoodMove` the same evidence inputs as the blunder path (score, PV, MultiPV spread,
opponent threat that was parried, `isOnlyMove`, `isSacrifice`). This alone changes the tone of the
~80% of plies that currently get boilerplate.

### Phase 3 — Adaptive classification *(fixes F3)*
In `chess-evaluator.js`, replace the fixed bands with a threshold function:

```js
function classificationThresholds({ phase, sharpness, wpBefore, depth, playerElo }) -> { inaccuracy, mistake, blunder }
```

- **sharpness** = spread between MultiPV line 1 and lines 2/3 (already available). Sharp position
  → *tighter* bands (small errors really do matter); quiet position → *looser* bands.
- **phase** — endgames punish small WP losses more (conversion technique), openings less.
- **decided positions** — generalise the existing `wpBefore >= 0.95` safeguard into a smooth
  damping of `wpLoss` as `wpBefore` approaches 0 or 1, instead of a cliff at 0.95/0.90.
- **search reliability** — widen bands when `depth` is low (Coach at 12) so Coach stops calling
  shallow-search noise a "mistake".
- **playerElo** (Coach persona) — keep verdicts honest but let the *reporting* threshold move:
  an 800-level session shouldn't flag 0.04 inaccuracies at all.

Keep the old constants as the default branch so existing tests keep passing; make adaptation
opt-in per call site.

### Phase 4 — Smarter, phase-aware detectors *(fixes F5, F8, F9)*
- **Real SEE.** Add `staticExchangeEval(board, square, side)` to `situation-recognizer.js`
  (iterative least-valuable-attacker swap-off, with x-ray/battery re-scan after each capture and
  pinned-defender exclusion). Rewrite `isPieceSafe` and `detectHangingPieceBlunder` on top of it.
  This kills the most common false positive: "leaves the Knight hanging" on a perfectly sound
  exchange or a real sacrifice.
- **Refutation corroboration.** `detectHangingPieceBlunder` should only claim a hanging piece when
  the engine's refutation actually captures it (or wins it in the PV within 2-3 plies).
- **`gamePhase(fen)`** helper (material + queens + developed-piece count) exported from
  `chess-evaluator.js`; gate opening vocabulary (development, castling, centre duo) to
  opening/middlegame, and add endgame detectors: king activity/opposition, rook behind the passed
  pawn, pawn-race tempo count, wrong-coloured-bishop draw, fortress hints.
- **Opening layer.** Move the book out of a 37-entry literal into a compact position-keyed table
  (Zobrist-ish string key of the FEN board field) so book detection survives transpositions; widen
  `detectOpeningPrincipleViolation` (undeveloped-pieces count, early flank pawn moves, blocked
  centre pawns, delayed castling under an open king file) and — important — make each rule check
  whether the engine agrees before it is reported.

### Phase 5 — Coach adaptivity *(fixes F10)*
- **Learner model** on `CoachManager`: `this.errorProfile = { hangingPiece: n, missedFork: n,
  kingSafety: n, endgameTechnique: n, openingPrinciple: n }`, incremented from the `tags` that
  `diagnose` returns. Use it to:
  - escalate wording on a repeated theme ("that's the third piece left en prise this game — scan
    every undefended piece before you commit");
  - bias `_getContextualChallenge` and `_findInstructiveBlunder` toward the learner's weakest
    theme instead of two hardcoded board checks;
  - drive an end-of-game summary of the top 2 recurring themes.
- **Persona-scaled diagnostics**: one explanation *depth* dial per persona — the 800-Elo persona
  gets one concrete idea in plain words, the 2200-Elo persona gets the variation and the
  positional justification. Same evidence, different composition budget (Phase 2 makes this a
  parameter, not a fork).
- **Fix `generateHint`**: run candidate captures through SEE before calling them "a tactical
  capture"; rank hints by the Phase-2 evidence for the *current* position rather than falling
  through to `legalMoves[0]`; keep hints one rung below the answer (name the target square or the
  motif, not the move) and scale that rung by persona.

### Phase 6 — Adaptive search budget *(fixes F11)*
- Replace hardcoded depths with `searchBudget({ phase, sharpness, mode, elapsedMs })`.
- **Threshold-boundary re-search**: when `|wpLoss − threshold| < ε`, re-run the position two plies
  deeper before committing to a verdict. This is cheap (it fires on a small fraction of plies) and
  removes most "why did it call that a mistake?" complaints.
- In Coach, budget by *wall clock* rather than depth so slow devices degrade gracefully instead of
  stalling the turn.

---

## 4. Suggested landing order

| Step | Phase | Size | Why here |
|---|---|---|---|
| 1 | 0 | XS | Test path fix + fixture corpus; nothing else is verifiable without it |
| 2 | 1 (wrapper only) | S | `move-diagnostics.js` delegating to current code; no behaviour change |
| 3 | 1 (rest) | L | Both modes call `diagnose`; revive `isOnlyMove`/`isSacrifice`/`mateMissed`; drop the Coach shortcut |
| 4 | 4 (SEE) | M | SEE + refutation corroboration removes the loudest false positives |
| 5 | 2 | L | Evidence ranking + severity/phase-scaled phrasing; engine-aware `explainGoodMove` |
| 6 | 3 | M | Adaptive thresholds, now that classification has one home |
| 7 | 4 (phase + opening) | M | Phase gating and the wider opening layer |
| 8 | 5 | M | Coach learner model, persona depth dial, hint fix |
| 9 | 6 | S | Adaptive budget + boundary re-search |

## 5. Guardrails
- `node test_browser_modules.js` must stay green at every step; `test_diagnostics.js` grows with
  each phase.
- Diagnosis must stay **deterministic** for a given (position, engine output) pair — template
  rotation is seeded by ply, never by `Math.random()`.
- No new runtime dependencies and no build step: every module stays UMD and loadable both from
  `index.html` and from Node.
- The output contract consumed by the UI (`move.analysis.{explanation, flaw, missed_chance,
  better_line}`, `move.tags`, `move.detailed_quality` — see `index.html:5085-5190`, `:6509`,
  `:6539`) must keep working; new fields (`confidence`, `evidence`) are additive.

---

## 6. Implementation Status (All Phases Complete)

| Phase | Milestone | Status | Key Deliverables & Evidence |
|---|---|---|---|
| **Phase 0** | Test Harness & Regression Corpus | **Complete** | Portable test path, `test_diagnostics.js` (39 fixtures, legal moves verified), phrasing audit |
| **Phase 1** | Shared `MoveDiagnostics.diagnose()` Core | **Complete** | `js/move-diagnostics.js` unified entry point, `isOnlyMove`/`isSacrifice`/`mateMissed` derivation, removed stale Coach shortcut |
| **Phase 2** | Evidence-Ranked Narration Core | **Complete** | 3-stage pipeline (Collect $\to$ Rank & Corroborate $\to$ Compose), engine agreement check, severity/spread phrase scaling, engine-aware `explainGoodMove` |
| **Phase 3** | Adaptive Classification Integration | **Complete** | `ChessEvaluator.classificationThresholds`, phase/sharpness/Elo tuning, smooth decided-position damping, enabled in analysis and coach modes |
| **Phase 4** | Smarter, Phase-Aware Detectors | **Complete** | Static Exchange Evaluation (`staticExchangeEval` with swap-off/x-ray), refutation corroboration, `gamePhase(fen)` helper, endgame detectors (Tarrasch rook behind passer, opposition), position-keyed transposition book table (`BOOK_POSITION_MAP`), widened opening principle violation checks |
| **Phase 5** | Coach Adaptivity & Persona Depth Dials | **Complete** | Coach learner model (`errorProfile` tracking repeated themes), escalation lines, motif/square hints with SEE verification, persona-scaled explanation depth dials (`mcmarty` concise, `sophy` instructional, `pikaru` dynamic, `mangoose` deep), theme-biased instructive blunders |
| **Phase 6** | Adaptive Search Budgets & Boundary Re-Search | **Complete** | `MoveDiagnostics.searchBudget({ phase, sharpness, mode, elapsedMs })`, wall-clock time degradation in Coach, $\pm 0.015$ threshold-boundary 2-ply re-search in `browser-analyzer.js` |

