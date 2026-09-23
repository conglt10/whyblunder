# i18n Keys & Coverage (EN/VI)

Source of truth for runtime strings: `js/i18n.js` (`WhyBlunderI18N`, UMD).
English stays inline at call sites (byte-identical EN product); `VI` holds
Vietnamese overrides only. Every lookup falls back to English, so missing
keys degrade gracefully and deterministically.

## Design rules

1. **Chess vocabulary stays English** in VI sentences: Blunder, Fork, Pin,
   Skewer, Hanging Piece, piece names, SAN moves, squares, ECO names.
   Only connective prose is Vietnamese (per approved plan).
2. **No persistence, no auto-detect**: `setSiteLang()` / `CoachManager.setLang()`
   are in-memory; every visit defaults to English (manual toggle only).
3. **Deterministic**: same branch/index selection in both languages; no new
   `Math.random()` (coach's pre-existing `pickRandom` untouched).
4. **Output contract additive**: `quality`, `detailed_quality`, `tags`,
   persona `id`/`elo`, DOM IDs, CSS classes unchanged. `diagnose()` gains
   additive `lang` in result; accepts `params.lang` / `context.lang`.
5. **Toggle scope**: language switch instantly re-renders static chrome
   (`data-i18n` family via `applyStatic`) and all subsequently generated
   content (new analyses, coach speech, hints). Already-rendered analysis
   prose keeps the language it was analyzed in (per-move MultiPV lines are
   not retained, so re-diagnosis without re-analysis is impossible);
   re-run analysis after switching for fully-VI explanations.

## Static chrome (`data-i18n` in index.html)

~106 tagged nodes: header tabs, EN/VI toggle (`#langBtnEN/#langBtnVI`),
New/Import menu, import drawer (tabs, depth, placeholders stay EN where they
are notation examples), progress strip, analysis panel, board + variation
banner, moves header/nav/speed, coach panel + modal (persona `id`/ELO/flags
untouched), mobile toolbar/sheets/options. Tooltips via `data-i18n-title`,
aria via `data-i18n-aria`.

## Dynamic JS coverage

| Module | Routed | Notes |
|---|---|---|
| `move-diagnostics.js` | `lang` in/out, passed to recognizer | `resolveLang(explicit → context → global → 'en')` |
| `situation-recognizer.js` | STAGE-3 composition (7 branches), flaw fallback, good-move finals, opp names (Trắng/Đen) | Fragments stay EN by design; `composeViBlunderExplanation` mirrors EN order |
| `coach-manager.js` | `voiceLines/voiceText/baitLines`, all feedback bubbles, `coachMoveDesc`, opening dialogue (8 openings + generic), game-over + takeaways, `HINT_VI` (10 motifs × 4 levels × 3 tiers), hint chrome | Move-commentary voice keys (`passedPawn/castle/fork/…`) are defined but never consumed → no VI needed |
| `browser-analyzer.js` | 5 user-facing error strings | via global lang at throw/push time |
| `chess-evaluator.js` | — (intentionally untouched) | quality keys are contract + display terms per approved plan |
| `opening-detector.js` | — (proper nouns stay EN) | |
| index.html inline | status badge/progress, move counts, variation banner/labels, Best/Win chips, MISSED badges, Key Moment titles, coach opening default | |

## Follow-ups (not in this pass)

- Persist choice in `localStorage` (1-line change, excluded per "manual toggle only").
- VI for dead move-commentary voice keys if they get wired up.
- PGN comment export language, docs-site language switcher.
