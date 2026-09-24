# WhyBlunder: chess.com-style UI

> **Status:** phases 1–5 implemented (see "What shipped" at the end). Presentation-only apart from the additive `ChessEvaluator.moveAccuracy/gameAccuracy/phaseAccuracy` helpers.


## Context
WhyBlunder today looks like **Lichess**: dark brown `--lic-*` tokens, a 3-column desktop studio
(`.col-analysis` diagnosis | `.col-board` | `.col-moves`), and on mobile a board + `#mobileSheet`
bottom sheet + `#mobileNavToolbar` (see `docs/mobile-ui-revamp-plan.md`, already shipped).
The goal is to make it feel like the **chess.com app**, especially its *Game Review* and
*Play vs Coach* flows. The engine does the same work; what changes is how results are shown:
a coach who talks to you, big classification icons, an accuracy summary, an eval graph, and one
large green "Next" button.

Constraints stay the same (AGENTS.md §4): no build step, vanilla JS/CSS in `index.html`, Bootstrap 5
is already loaded, and `test_browser_modules.js` checks for existing IDs and classes, so **keep
every tested ID/class and add new ones next to them**. This is presentation-only: no changes to
`js/move-diagnostics.js`, `chess-evaluator.js` or the output contract.

---

## 1. What makes chess.com's UI feel like chess.com (the target)

| Trait | chess.com | WhyBlunder today | Change |
|---|---|---|---|
| Palette | Charcoal `#312e2b` / `#262522` panels, green CTA `#81b64c`, green board `#779556`/`#ebecd0` | Lichess brown, blue accent | New `--cc-*` token layer, with the brown theme kept as an option |
| Shell | Slim left **icon sidebar** (desktop), **bottom tab bar** (mobile) | Top header with segmented tabs | Sidebar + tab bar; the header shrinks to a title bar |
| Layout | Board on the left and as large as possible; **one right panel** with tabs | 3 equal-weight columns | 2 columns: board + a tabbed right panel |
| Review | **Summary first** (accuracy %, counts per classification, eval graph, "Start Review"), then a step-by-step walkthrough | Jump straight into the move list | New Review Summary screen + walkthrough mode |
| Coach voice | Avatar + speech bubble explaining *every* move | Diagnosis prose in a panel | Coach bubble becomes the main way explanations are shown in Analysis mode too |
| Classifications | Round coloured icons (!!, !, ★, 👍, 📖, ?!, ?, ✕, ??) on the board square and in the move list | Text badges `?!` | Icon set + a badge on the destination square |
| Primary action | One big green bottom button ("Next", "Start Review", "Hint") | Small toolbar buttons | Big green bottom CTA on both platforms |
| Board chrome | Player cards with avatar, flag, rating and captured pieces; coordinates inside the edge squares | Similar, but denser | Restyle only |

---

## 2. Design system: add a token layer, don't delete the old one
In the `:root` block (~`index.html:22-70`) add `--cc-*` tokens and map them onto the existing
`--lic-*` names with `body[data-theme="cc"]`. Old selectors then pick up the new look for free:

```css
body[data-theme="cc"] {
  --lic-bg-canvas:#312e2b; --lic-bg-surface:#262522; --lic-bg-surface-hover:#3c3a37;
  --lic-border:#3c3a37; --lic-text-primary:#e8e6e3; --lic-text-muted:#989795;
  --lic-blue:#81b64c; /* primary accent becomes green */
  --cc-cta:#81b64c; --cc-cta-shadow:#45753c; --cc-radius:8px;
  --cc-board-light:#ebecd0; --cc-board-dark:#779556;
  /* classification colours (chess.com-like) */
  --q-brilliant:#26c2a3; --q-great:#749bbf; --q-best:#81b64c; --q-excellent:#96bc4b;
  --q-good:#96af8b; --q-book:#a88865; --q-inaccuracy:#f7c631; --q-mistake:#e58f2a;
  --q-miss:#ee6b55; --q-blunder:#ca3431;
}
```
- Typography: bump to 14/15px on desktop panels. chess.com uses a heavier sans font, so use a
  system stack with `font-weight:600` for headings.
- Buttons: `.cc-btn-cta` gets the chunky 3D look (`box-shadow: 0 4px 0 var(--cc-cta-shadow)`,
  translateY on `:active`).
- Board: override `.white-1e1d7` / `.black-3c85d` (chessboard.js square classes in
  `css/chessboard-1.0.0.css`) with the board tokens. Add a "Board theme" select (Green / Brown /
  Blue) in settings. Coordinates go inside the corner squares, coloured to contrast with the square.
- Theme toggle: `localStorage['whyblunder_theme']`, default `cc`.

---

## 3. Desktop layout (≥ 992px)

```
┌──┬──────────────────────────────────────────┬─────────────────────────────┐
│☰ │  [avatar] Opponent (1650) 🇺🇸   ♟♟♞  +2  │ [Review] [Moves] [Coach] ⚙ │ ← tabs
│▶ │ ┌─┐┌────────────────────────────────────┐│ ┌─────────────────────────┐ │
│📊│ │e││                                    ││ │ 😎 Coach bubble          │ │
│🎓│ │v││             BOARD                  ││ │ "Nxd5?? hangs the knight│ │
│  │ │a││   (as large as fits: min(vh-140,   ││ │  because…"  [Show line] │ │
│  │ │l││    vw-panel-sidebar))              ││ ├─────────────────────────┤ │
│  │ │ ││                                    ││ │ ▁▂▅▇▅▃ eval graph        │ │
│  │ └─┘└────────────────────────────────────┘│ ├─────────────────────────┤ │
│⚙ │  [avatar] You (1500)            ♝  +0    │ │ 1. e4 ★   e5 📖          │ │
│  │                                          │ │ 2. Nf3 ★  Nc6 📖 …       │ │
└──┴──────────────────────────────────────────┤ ├─────────────────────────┤ │
                                              │ │ |< <  [   Next ▶   ]  > >|│ │ ← green CTA
                                              └─────────────────────────────┘
```

- **Left sidebar** (`<nav class="cc-sidebar">`, 56px wide, expands to 180px on hover): Analyze
  (`tabModeAnalysis`), Play Coach (`tabModeCoach`), Import (triggers `btnTogglePgn`), Settings.
  The existing `.lic-header` buttons stay in the DOM because tests check for them. Wrap them and
  hide them visually with `body[data-theme="cc"] .lic-header{display:none}`, and have the sidebar
  buttons forward `.click()` to them so `switchAppMode()` and its wiring don't change.
- **Grid**: change `.studio-grid` to `grid-template-columns: auto minmax(360px, 420px)`.
  `.col-board` stays; `.col-analysis` and `.col-moves` move **into** a new
  `.cc-side-panel` as tab panes (moved with JS at boot, or reparented in markup; IDs don't change).
  - **Review tab**: coach bubble (reuse the `#moveExplanation` render from `showMoveExplanation()`
    `index.html:6429`, restyled as a bubble with avatar), eval graph, key-moment chips.
  - **Moves tab**: `#analysisContainer` move sheet, with classification icons.
  - **Coach mode**: the right panel shows `#colCoach` content (already has bubble, move sheet and
    action bar). Just restyle it: dark bubble, green Hint CTA.
- **Board sizing**: one CSS variable
  `--board-size: min(calc(100vh - 2*var(--playerbar-h) - 32px), calc(100vw - 56px - 420px - 48px))`,
  applied to `.board-container-card`. Call `board.resize()` + `updateSvgDimensions()`
  (`index.html:4797`) only on window resize.
- **Vertical eval bar** `#evalGauge` stays on the left of the board. Restyle it white/charcoal with
  the score label at the end of the bar that is winning.
- **Bottom of the right panel**: a nav row with `btnFirst/btnPrev/btnNext/btnLast` (current
  `#boardToolbar`, moved) plus a big green **Next** CTA wired to `btnNextKey`. During a variation,
  the CTA label changes to "Return" (`btnReturnMainLine`).

---

## 4. Mobile layout (< 992px): chess.com app style

Two screens instead of one crowded one.

**A. Review Summary screen** (shown right after analysis finishes, or on tapping "Review"):
```
┌───────────────────────────┐
│ ←  Game Review         ⋯  │
│  😎 "Solid game! You found │
│     3 great moves…"        │
│  ▁▂▅▇▅▃▂▅ eval graph (tap) │
│   You  87.4 │ 72.1 Opp     │  ← accuracy
│  !! Brilliant   1 │ 0      │
│  !  Great       2 │ 1      │
│  ★  Best       14 │ 9      │
│  …  Blunder     0 │ 2      │
│  Opening / Middle / End ✓  │
│ [      Start Review      ] │  ← green CTA
└───────────────────────────┘
```

**B. Walkthrough screen**:
```
┌───────────────────────────┐
│ ←  Game Review      ⚙  ⋯  │ 44px
│ 👤 Opp (1650)    ♟♟ +2    │ 36px
│ ▓▓▓▓▓▓▓░░░ +1.2 (horiz)   │ 8px  (#mobileEvalBar)
│                           │
│        BOARD (100vw)      │  ← ?? icon badge on the destination square
│                           │
│ 👤 You (1500)        +0   │ 36px
│ ┌───────────────────────┐ │
│ │😎 Nxd5?? is a blunder │ │  ← coach card (#mobileSheet peek),
│ │ The knight hangs… ▸   │ │     tap to expand = full diagnosis
│ └───────────────────────┘ │
│ 12. Nxd5?? Qxd5 13. c4 …  │  ← one move strip with icons (#mobileMoveTicker)
├───────────────────────────┤
│ ⚙Opts  ◀   [ Next ▶ ]  ▶ │  ← bottom bar, big green CTA in the middle
└───────────────────────────┘
```

Implementation, reusing what's already there:
- **App bar**: `.lic-header` on mobile shows a back arrow, a context title ("Game Review" /
  "Play Coach") and the ⋯ button (`mobileBtnMore` → `#mobileOptionsSheet`). The mode switch moves
  to a **bottom tab bar** on the home/import screen only (Analyze / Play Coach / Import), like
  chess.com's Home/Play/Puzzles tabs.
- **Coach card** = restyled `#mobileSheet` (`index.html:4298`). The peek state shows avatar,
  classification icon and a one-line coach sentence. Half state shows the full explanation plus
  "Show best line" / "Show threat" buttons (existing variation handlers). Keep the drag and
  `data-state` logic.
- **Move strip** = the existing `#mobileMoveTicker` (`renderMobileMoveTicker()` `index.html:6344`),
  with icons instead of `.ticker-badge-*` text.
- **Bottom bar** = the existing `#mobileNavToolbar` with its slots rearranged:
  `Options | ◀ | [Next ▶ green, 2× width] | ▶`. `#mobileNavCapsule` becomes the CTA and
  `mobileBtnKey` is folded into it: tapping Next goes to the next key moment, like chess.com's
  "Next" in review. Coach mode keeps its slots with a green **Hint** CTA in the middle
  (already `mobileCoachBtnHint`).
- **Board**: full width, no side eval bar, and the `--m-chrome-h` math from the mobile revamp
  stays the single source of truth for height.
- Landscape phones and tablets (600–991px): use the desktop 2-column layout with a narrower panel
  (`minmax(300px, 40vw)`).

---

## 5. New features the chess.com look depends on

1. **Accuracy score** (per player): chess.com-style CAPS-like average of per-move accuracy
   computed from `win_prob_loss`, which is already in the output contract:
   `moveAcc = 103.1668 * exp(-0.04354 * (wpLossPct)) - 3.1669`, clamped to [0,100], then averaged
   per side. Put it in a new UMD helper `ChessEvaluator.gameAccuracy(moves)` in
   `js/chess-evaluator.js`. The helper is additive and deterministic, and gets a unit test.
2. **Classification counts**: count `detailed_quality` for each side.
3. **Eval graph**: inline SVG `<svg id="ccEvalGraph">` built from `score_cp` (clamped ±1000 and
   mapped through WP), white area over dark, with dots coloured by classification at key moments.
   Clicking jumps to that ply (reuse the move-select handler behind `showMoveExplanation`).
4. **Classification icon set**: one `cc-q-icon` component (a round SVG badge with the glyph), used
   in the move list, ticker and coach bubble, and as a **badge on the board square**. The badge
   goes into the existing `#arrow-svg` overlay (`updateSvgDimensions` already maps squares to pixels).
5. **Coach voice for Analysis**: generate the one-line summary from the existing `analysis.flaw /
   explanation` (first sentence) and put it in a bubble with a persona avatar (reuse the
   persona emoji and name from `coach-manager.js`).
6. **Phase grades** (Opening/Middlegame/Endgame): average accuracy per phase using
   `ChessEvaluator.gamePhase(fen)`.

---

## 6. Critical files
- `index.html`: tokens (`:root` ~22-70), a new `/* === CC THEME === */` CSS block at the end of
  `<style>`, markup for `.cc-sidebar`, `.cc-side-panel` tabs, `#ccReviewSummary`, and JS in the main
  IIFE: `renderReviewSummary()`, `renderEvalGraph()`, `renderSquareBadge()`, theme/board-theme
  toggle, and the updated `switchAppMode()` (`index.html:8977`).
- `js/chess-evaluator.js`: add `gameAccuracy()` and `phaseAccuracy()`, nothing else.
- `test_browser_modules.js`: add assertions for the new IDs and the accuracy helper.
  Don't remove existing ones.
- `AGENTS.md` §6 and a new `docs/chesscom-ui-plan.md`: document the `--cc-*` layer.

## 7. Phasing (each phase ships green)
1. Tokens, `data-theme="cc"`, board colours, buttons, classification icons (pure CSS, low risk).
2. Desktop 2-column shell, sidebar and tabbed right panel with the bottom CTA.
3. Mobile walkthrough: coach-card sheet, icon ticker, CTA bottom bar.
4. Accuracy, eval graph and Review Summary screen (desktop tab + mobile screen).
5. Square badges, phase grades, settings (theme / board theme), polish and a11y (44px taps, focus rings).

## 8. Verification
- `node test_browser_modules.js && node test_diagnostics.js`: 0 failures after every phase.
- Unit-test `gameAccuracy()` with fixtures: all-best game ≈ 100, one blunder lowers that side only.
- `python3 -m http.server 3030`, then take Playwright screenshots (Chromium at `/opt/pw-browsers`)
  at 1440×900, 1024×768, 390×844 (iPhone 14) and 844×390 landscape, in both modes. Check: the board
  never resizes when the sheet opens, the CTA sits within the safe area, and no text is under 11px.
- Manual flow: import the sample "Morphy's Opera", analyze, check the Summary appears, then
  Start Review, Next through key moments and a variation, and Return. In Coach mode: play, Hint,
  Takeback, Resign, Review.

---

## What shipped vs. the plan
- **Done:** token layer + theme toggle (Chess.com / Lichess) and board themes (Green / Brown / Blue); desktop sidebar rail + 2-column shell;
  coach bubble for every analysed move (desktop panel + mobile sheet peek); classification icons in the move list and as board badges
  for every move; eval graph (summary + mini strip in the Moves panel, click-to-jump, live cursor); Game Review summary
  (accuracy, counts, phase grades, Start Review CTA) as a right-column panel on desktop and a full-screen sheet on mobile;
  green "Next" CTA (desktop toolbar and mobile bottom bar); animation speed moved into the sidebar Settings menu.
- **Deviations:** the sidebar is a fixed labelled rail rather than hover-expanding. The right panel stacks (coach, then moves)
  instead of using tabs, which is closer to chess.com's review panel and needs no DOM moves.
- **Not done yet:** tablet (600–991px) 2-column layout; mobile bottom tab bar on the home screen; icon chips in the
  `#mobileMoveTicker` (it is hidden on phones anyway). Also, phone landscape (844×390) cuts off the bottom board rank. That was
  already the case before this work.
