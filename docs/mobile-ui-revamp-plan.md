# WhyBlunder — Mobile UI Revamp: Plan & Design Definition

> **Audience:** the agent/developer who will implement this.
> **Status:** design approved for implementation, not yet built.
> **Scope:** mobile & small-tablet presentation of `index.html` (Analysis mode + Play Coach mode).
> No changes to engine, diagnostics, coach logic, or the public output contract.

---

## 0. TL;DR

The mobile build today is a squeezed desktop layout. Six things are structurally broken:

1. The top app bar overflows horizontally and clips its own buttons.
2. The bottom navigation sits *under* the iOS Safari toolbar because `viewport-fit=cover` is
   missing, so every `env(safe-area-inset-*)` in the stylesheet evaluates to `0`.
3. Board height is derived from a hand-tuned magic number (`calc(100dvh - 315px)`), duplicated
   per-mode, and wrong whenever the chrome changes.
4. The content area below the board (Move Analysis / Coach) is a squashed, clipped leftover
   rather than a first-class surface.
5. Touch targets are 24–28px in several clusters; type drops to 0.62rem.
6. The coach speech bubble is a white card in a dark app, and the primary action is an unlabeled
   green lightbulb.

The fix is a proper **mobile app shell**: one viewport-height source of truth, a compact app bar,
a stable board region, and an **overlay bottom sheet** for all secondary content, over a fixed
bottom action bar. Board size stops being a magic number and becomes a derived value.

**Do not** rewrite `index.html` wholesale. Add one clearly delimited mobile-revamp CSS block and
surgically neutralise the listed legacy rules. Both test suites must stay green.

---

## 1. Constraints (read before touching anything)

| Constraint | Consequence |
| :--- | :--- |
| Zero build step, no npm, no bundler (`AGENTS.md` §4.1) | Vanilla CSS + vanilla JS inside `index.html`. No PostCSS, no Tailwind, no framework. |
| Bootstrap 5.3 + Bootstrap Icons are already loaded via CDN | Reuse `offcanvas`, `modal`, `dropdown`, `d-none`. Do not add a new UI library. |
| `test_browser_modules.js` asserts literal strings in `index.html` | Every ID/class/function name listed in §9 must survive. New things get new names. |
| Single-file UI | All new CSS goes into the existing `<style>` block; all new JS into the existing IIFE. |
| Both suites must pass | `node test_browser_modules.js && node test_diagnostics.js` → 0 failures. |
| Deterministic diagnostics | This work is presentation-only. Do not touch `js/*.js` diagnosis paths. |

---

## 2. Problem inventory (traced from the two screenshots)

Each row is a defect, its visible symptom, and the root cause with a file reference.

### 2.1 App bar

| # | Symptom (screenshot) | Root cause |
| :-- | :--- | :--- |
| A1 | **Screenshot 2:** "Import Game" is sliced off the right edge; `← → F Space` key legend is rendered on a phone. | `switchAppMode()` calls `analysisKeysLegend.classList.remove('d-none')` (`index.html:7737`), destroying the `d-none d-lg-flex` responsive pair declared at `index.html:3087`. The legend then forces the header past the viewport. |
| A2 | **Screenshot 1:** "Play Coach" wraps onto two lines; the bar is visually taller than its declared 42px. | `.lic-header` (`index.html:95`, mobile override `index.html:2011`) is `display:flex; justify-content:space-between` with **no** `flex-wrap`, **no** `min-width:0` on children, and `.lic-mode-btn` (`index.html:2228`) has no mobile sizing. Children cannot shrink, so they overflow or wrap internally. |
| A3 | Five competing controls in a 390px bar: brand, 2-tab switch, primary action, collapse chevron (+ legend). | No information hierarchy for small screens. Nothing is demoted to an overflow menu. |
| A4 | The "hide header" chevron and the floating `Menu` pill (`index.html:3066`) are a manual, discoverable-only-by-accident space hack. | Compensating for A1–A3 instead of fixing them. |

### 2.2 Viewport, safe areas, bottom chrome

| # | Symptom | Root cause |
| :-- | :--- | :--- |
| B1 | **Screenshot 2:** the bottom nav ("MOV…", ⚡, capsule) is half-hidden behind the Safari URL bar. | `index.html:5` viewport meta lacks `viewport-fit=cover`. Without it iOS reports `env(safe-area-inset-bottom) = 0`, so the one safe-area rule in the file (`index.html:1869`) is a no-op. |
| B2 | Layout jumps as the iOS toolbar collapses/expands. | `html, body { height: 100dvh; overflow: hidden !important }` (`index.html:2006-2012`) makes a fixed app shell, but `dvh` and the visual viewport disagree during Safari's toolbar animation. Nothing listens to `visualViewport`. |
| B3 | `user-scalable=no, maximum-scale=1.0` (`index.html:5`). | Accessibility failure (WCAG 1.4.4). Pinch-zoom must not be disabled app-wide. |
| B4 | Bottom nav has no elevation/blur, so board pieces visually collide with it. | `.mobile-nav-toolbar` (`index.html:1862`) is an in-flow flex child with a 1px top border only. |

### 2.3 Board region

| # | Symptom | Root cause |
| :-- | :--- | :--- |
| C1 | Board eats ~55% of the screen and pushes all content off the fold. | `.board-container-card { max-width: min(100%, calc(100dvh - 315px)) }` (`index.html:2046`) — a magic number, duplicated for coach (`315` → `330` → `280` at `index.html:2341-2347`). It does not track the real chrome height, and on a tall phone it always resolves to `100%` (width-bound), so the board is *always* full width. |
| C2 | File/rank coordinates (`a b c d …`, `1–8`) sit on top of pieces and are hard to read. | `.notation-322f9` is vendor default: 14px Helvetica, absolutely positioned inside the square (`css/chessboard-1.0.0.css:39-51`). No mobile treatment. |
| C3 | The eval bar reads as a full-width white progress bar with an orphan `0.0`. | `.mobile-eval-bar` (`index.html:1719`): track is `#141311`, fill is `#f0f0f0` at 50%, and the pill is pinned dead-centre regardless of value. At 0.0 the white half + centred pill looks like a loading state. It is also shown before any game is loaded. |
| C4 | Player strips waste a full line each on metadata. | `updateCoachPlayerBars()` (`index.html:7397`) writes `Coach Pikaru (1600) 🇺🇸` + `Speed & Passed Pawn Prodigy` into a 22px-min-height bar (`index.html:2058`). The tagline has no value on a phone. |

### 2.4 Content region (Analysis + Coach)

| # | Symptom | Root cause |
| :-- | :--- | :--- |
| D1 | **Screenshot 2:** the Move Analysis empty state is cut mid-sentence by the bottom nav. | `.col-analysis` is `flex:1` inside an `overflow:hidden` shell (`index.html:2072-2090`); whatever is left after the board wins, and it is often ~90px. |
| D2 | **Screenshot 1:** the coach panel's opening strip, move ticker and action bar are pushed below the fold. | Same: coach column is `flex:1` after a width-bound board (`index.html:2348`). |
| D3 | Content density collapses to 0.62–0.78rem with 1–3px padding (`index.html:2107-2165`). | Desktop density values scaled down instead of a mobile type scale. |
| D4 | Two separate move surfaces on one screen (ticker under the board *and* an offcanvas sheet) plus a third in coach mode. | `#mobileMoveTicker` (`index.html:3310`), `#mobileMovesOffcanvas` (`index.html:3524`), `#coachMobileMoveTicker` (`index.html:3453`) are three implementations of one idea. |

### 2.5 Coach mode specifics

| # | Symptom | Root cause |
| :-- | :--- | :--- |
| E1 | White speech bubble in a dark app; it dominates the screen. | `.coach-speech-bubble { background:#ffffff; color:#1a1a1a }` (`index.html:2622`) with a white CSS tail (`index.html:2610-2620`). Mobile cap is 88px (`index.html:2408`) so long coaching text silently scrolls inside a bubble with no affordance. |
| E2 | Primary action is a giant unlabeled green lightbulb. | `.btn-coach-hint { flex-grow:1; border-radius:22px }` (`index.html:2882`) + icon-only markup (`index.html:3474`). Unclear what it does; disproportionate weight vs. Resign/Takeback at 36px. |
| E3 | Resign (flag) and Takeback sit at 36×36 on mobile (`index.html:2503-2509`). | Below the 44px touch minimum, and Resign is destructive with no confirmation affordance. |

### 2.6 Touch targets & type (both modes)

| Element | Current | Required |
| :--- | :--- | :--- |
| `.ticker-nav-btn` (`index.html:1775`) | 24 × 28 | ≥ 44 × 44 hit area |
| `.var-nav-btn-group .btn-lic-tool` (`index.html:2208`) | 26 × 26 | ≥ 44 × 44 hit area |
| `.coach-icon-btn` (`index.html:2557`, mobile `index.html:2372`) | ~20px glyph, no padding box | ≥ 44 × 44 hit area |
| `.mobile-tool-label` (`index.html:1894`) | 0.6rem (9.6px) | ≥ 11px |
| `.ticker-badge` (`index.html:1849`) | 0.62rem (9.9px) | ≥ 11px |
| `.diag-tag` mobile (`index.html:2135`) | 0.65rem (10.4px) | ≥ 11px |

---

## 3. Design principles

1. **Board first, everything else on demand.** The board is the only element guaranteed a fixed
   slot. Every other surface is either a thin strip or a sheet the user pulls up.
2. **One height source of truth.** A single `--app-h` custom property, fed by `visualViewport`,
   drives the shell. No component computes its own `100dvh - N`.
3. **Never move the board.** Secondary surfaces *overlay*; they do not resize the board. Board
   `resize()` runs only on orientation/viewport change, never on sheet drag.
4. **One surface per job.** One move list, one coach channel, one action bar per mode.
5. **Thumb zone.** Primary actions live in the bottom 25% of the screen. The app bar is for
   identity and mode only.
6. **44px / 11px floors.** No interactive element below 44×44 hit area; no text below 11px.
7. **Theme integrity.** Everything uses the existing `--lic-*` tokens. No white cards.
8. **Progressive disclosure.** Peek → Half → Full sheet, instead of cramming.

---

## 4. Breakpoints & tokens

### 4.1 Breakpoints

```
phone      :  max-width: 599.98px      (new — primary target of this work)
tablet     :  600px – 991.98px         (existing mobile shell, relaxed density)
desktop    :  min-width: 992px         (unchanged; must not regress)
landscape  :  max-width: 991.98px and (orientation: landscape) and (max-height: 500px)
```

`d-lg-none` / `d-none d-lg-flex` (Bootstrap `lg` = 992px) stay valid for the mobile/desktop split.
The 600px boundary is new and lives only in the revamp block.

### 4.2 New tokens

Add to `:root` in `index.html` (next to the existing `--lic-*` block, ~`index.html:22-70`):

```css
:root {
  /* --- Mobile shell geometry (phone defaults; overridden per breakpoint) --- */
  --app-h:            100svh;   /* JS overwrites with visualViewport.height */
  --safe-top:         env(safe-area-inset-top, 0px);
  --safe-bottom:      env(safe-area-inset-bottom, 0px);
  --safe-left:        env(safe-area-inset-left, 0px);
  --safe-right:       env(safe-area-inset-right, 0px);

  --m-gutter:         8px;    /* horizontal page gutter on phone */
  --m-gap:            6px;    /* vertical gap between shell regions */

  --m-appbar-h:       48px;
  --m-evalstrip-h:    10px;
  --m-playerbar-h:    32px;
  --m-sheet-peek-h:   76px;   /* collapsed sheet: header + one line */
  --m-bottombar-h:    56px;   /* excluding safe area */

  /* Derived: total non-board chrome. Never hand-tune a board height again. */
  --m-chrome-h: calc(
      var(--m-appbar-h)
    + var(--m-evalstrip-h)
    + (var(--m-playerbar-h) * 2)
    + var(--m-sheet-peek-h)
    + var(--m-bottombar-h)
    + var(--safe-bottom)
    + (var(--m-gap) * 5)
  );

  /* --- Mobile type scale (phone only; desktop scale unchanged) --- */
  --m-fs-body:        0.9375rem;  /* 15px — diagnosis prose, coach speech */
  --m-fs-ui:          0.875rem;   /* 14px — buttons, labels, list rows     */
  --m-fs-meta:        0.75rem;    /* 12px — captions, counts               */
  --m-fs-chip:        0.6875rem;  /* 11px — HARD FLOOR. Nothing smaller.   */

  --m-tap:            44px;       /* minimum hit area */
  --m-radius:         10px;
  --m-radius-sheet:   16px;

  --m-z-sheet:        1035;
  --m-z-sheet-scrim:  1034;
  --m-z-bottombar:    1040;
  --m-z-appbar:       1020;
}

body.mobile-header-hidden { --m-appbar-h: 0px; }
```

> Bootstrap's modal backdrop is `1050` and modal `1055`. Keeping the sheet at `1035` and the
> bottom bar at `1040` means the coach settings modal still covers everything. Do not exceed 1045.

### 4.3 Viewport meta (`index.html:5`) — replace

```html
<!-- before -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<!-- after -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

This single line is what makes every `env(safe-area-inset-*)` in the file start working (fixes **B1**)
and restores pinch-zoom (fixes **B3**). Drag-to-move on the board is already protected by
`touch-action` / `user-select` rules on `#board` (`index.html:~1032`); add `touch-action: none` to
`.board-container` to be safe (see §6.3).

---

## 5. Target layout

### 5.1 Analysis mode — phone portrait

```
┌──────────────────────────────────────────────┐  ← safe-area-inset-top
│ [icon] │ Analysis · Coach │        [+] [⋯]   │  app bar        48
├──────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓│░░░░░░░░░░░░░░░░░░         +0.4  │  eval strip     10
│ ● Magnus Carlsen (2830)          ♟♟♝    +3   │  player bar     32
│ ┌──────────────────────────────────────────┐ │
│ │                                          │ │
│ │              C H E S S B O A R D         │ │  square, width-bound
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│ ● You (1450)                                 │  player bar     32
├══════════════════════════════════════════════┤
│                  ────                        │  grab handle
│ 12. Nxd5  [BLUNDER]  +1.2 → −2.4       ⌃    │  sheet peek     76
├──────────────────────────────────────────────┤
│  ☰      ◀      12. Nxd5        ▶      ⚡     │  bottom bar     56
│ Moves        24 of 61                  3/7   │
└──────────────────────────────────────────────┘  ← safe-area-inset-bottom
```

Sheet states:

| State | Height | Entered by |
| :--- | :--- | :--- |
| `peek` (default) | `var(--m-sheet-peek-h)` | default; swipe down from `half` |
| `half` | `min(52vh, calc(var(--app-h) * 0.52))` | tap the peek row, drag up, or tap a move |
| `full` | `calc(var(--app-h) - var(--m-appbar-h) - 56px)` | drag up from `half`; adds a scrim |

At `half` and `full` the sheet overlays the board. The board does **not** resize.

### 5.2 Coach mode — phone portrait

```
┌──────────────────────────────────────────────┐
│ [icon] │ Analysis · Coach │     [New] [⋯]    │  app bar        48
├──────────────────────────────────────────────┤
│ 😎 Coach Pikaru  [1600]              ● turn  │  player bar     32
│ ┌──────────────────────────────────────────┐ │
│ │              C H E S S B O A R D         │ │
│ └──────────────────────────────────────────┘ │
│ ● You                              ♟ +1      │  player bar     32
├══════════════════════════════════════════════┤
│                  ────                        │
│ 😎 Nice! That knight was hanging — you…  ⌃  │  sheet peek     76
├──────────────────────────────────────────────┤
│  🏳      ◀      💡 Hint      ↺       ☰      │  bottom bar     56
│ Resign         (primary)   Undo   Moves      │
└──────────────────────────────────────────────┘
```

Coach sheet at `half` contains, in order: opening strip (name + ECO), the full coach message,
blunder take-back actions when active, then the move list. No eval strip in coach mode
(already suppressed at `index.html:2266`; keep that).

### 5.3 Landscape (`max-height: 500px`)

Two columns: board left (height-bound, `height: calc(var(--app-h) - var(--m-appbar-h) - 8px)`,
`aspect-ratio: 1`), sheet docked right as a static 320px panel — no peek/half/full, no bottom bar
(actions move into the right panel's footer). App bar shrinks to 40px.

---

## 6. Component specifications

For every component: replace the legacy rule, keep the ID.

### 6.1 App bar — `.lic-header`

**Anatomy (phone):** `[brand 28px] [segmented control, flex:1 1 auto, min-width:0] [primary action] [⋯ 44px]`

```css
@media (max-width: 991.98px) {
  .lic-header {
    height: var(--m-appbar-h);
    min-height: var(--m-appbar-h);
    padding: 0 max(var(--m-gutter), var(--safe-right)) 0 max(var(--m-gutter), var(--safe-left));
    padding-top: var(--safe-top);
    gap: 8px;
    flex-wrap: nowrap;
    overflow: hidden;
  }
  .lic-header > * { min-width: 0; }
  .lic-brand span { display: none; }            /* wordmark off below 600px */
}
@media (min-width: 600px) and (max-width: 991.98px) {
  .lic-brand span { display: inline; }
}
```

Rules:

- **Fix A1 properly:** stop toggling `d-none` on `#analysisKeysLegend`. Give it a dedicated class
  and toggle that instead:
  ```html
  <div class="analysis-keys-legend d-none d-lg-flex …" id="analysisKeysLegend">
  ```
  ```js
  // index.html:7710 and :7737 — replace classList.add/remove('d-none') with:
  analysisKeysLegend.classList.toggle('mode-hidden', mode === 'coach');
  ```
  ```css
  .analysis-keys-legend.mode-hidden { display: none !important; }
  @media (max-width: 991.98px) { .analysis-keys-legend { display: none !important; } }
  ```
- **Mode switch:** `.lic-mode-btn` label text `"Play Coach"` → `"Coach"` on phone via a `<span
  class="mode-btn-label-full">Play </span>Coach` split, or a CSS-only `::after`. Keep the icon.
  `height: 36px; padding: 0 12px; white-space: nowrap; font-size: var(--m-fs-ui);`
- **Right cluster (A3):** exactly **two** controls on phone:
  - primary contextual button — `Import` (analysis, `#btnTogglePgn`) or `New` (coach,
    `#btnHeaderNewCoachGame`), icon + short label, `height: 36px`;
  - a new **overflow button** `#mobileBtnMore` (44×44, `bi-three-dots-vertical`) opening the
    **Options sheet** (§6.8).
  The import split-dropdown toggle, depth select, speed select, flip, and "hide header" all move
  into the Options sheet.
- **A4:** keep `#btnToggleMobileHeader` and `#btnRestoreMobileHeader` in the DOM (IDs referenced by
  existing handlers at `index.html:8012-8037`), but move the *trigger* into the Options sheet and
  restyle `.btn-restore-mobile-header` as a 44×44 circular floating button at
  `top: max(8px, var(--safe-top))`.

**Acceptance:** at 320px width, in both modes, `document.querySelector('.lic-header').scrollWidth
=== clientWidth`. No child clipped.

### 6.2 Shell height model — replaces B2/C1

Add once, near the top of the mobile block:

```css
@media (max-width: 991.98px) {
  html, body { height: var(--app-h); overflow: hidden; overscroll-behavior: none; }
  body { display: flex; flex-direction: column; }
  .studio-container { flex: 1; min-height: 0; padding: var(--m-gap) var(--m-gutter) 0; }
}
```

```js
// Single source of truth for viewport height. Place near the other resize wiring
// (index.html:3981) inside the existing IIFE.
function syncAppViewport() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-h', h + 'px');
}
syncAppViewport();
window.addEventListener('resize', syncAppViewport);
window.addEventListener('orientationchange', syncAppViewport);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncAppViewport);
}
```

Board sizing becomes derived, and the three magic numbers
(`index.html:2046`, `:2341`, `:2345`) are **deleted**:

```css
@media (max-width: 991.98px) {
  .board-container-card {
    width: 100%;
    max-width: min(100%, calc(var(--app-h) - var(--m-chrome-h)));
    margin-inline: auto;
    gap: var(--m-gap);
  }
}
```

Because `--m-chrome-h` is composed from the same tokens the components use, changing any strip
height automatically re-sizes the board. `body.mobile-header-hidden` zeroes `--m-appbar-h` and the
board grows — no second rule needed.

Call `board.resize()` + `updateSvgDimensions()` (debounced ~100ms) from `syncAppViewport`, and
**never** from sheet transitions.

### 6.3 Board & coordinates — fixes C2

```css
@media (max-width: 991.98px) {
  .board-container { touch-action: none; }

  /* Legible, unobtrusive coordinates */
  .notation-322f9 {
    font-family: 'JetBrains Mono', monospace;
    font-size: clamp(8px, 2.4vw, 11px);
    font-weight: 700;
    opacity: 0.78;
    text-shadow: 0 1px 1px rgba(0,0,0,0.25);
  }
  .alpha-d2270  { bottom: 1px; right: 3px; }
  .numeric-fc462 { top: 2px; left: 3px; }
}
```

Keep `showNotation` default (`true`) — do not change `boardConfig` at `index.html:3911`; the
vendor markup is what `.notation-322f9` targets.

Board wrapper on phone: `border-radius: var(--m-radius); overflow: hidden;` so the board corners
match the shell.

### 6.4 Eval strip — `#mobileEvalBar` (fixes C3)

Keep the IDs `mobileEvalBar`, `mobileEvalWhite`, `mobileEvalPill` (asserted, `test_browser_modules.js:723`).

```css
@media (max-width: 991.98px) {
  .mobile-eval-bar {
    height: var(--m-evalstrip-h);
    margin: 0;
    border: none;
    border-radius: 999px;
    background: #3a3734;              /* the BLACK side — visibly dark, not near-black */
    overflow: visible;
  }
  .mobile-eval-track { border-radius: 999px; overflow: hidden; background: transparent; }
  .mobile-eval-fill-white { background: #e8e6e3; }

  /* centre tick so 0.0 reads as "balanced", not "half loaded" */
  .mobile-eval-bar::after {
    content: ''; position: absolute; left: 50%; top: 0; bottom: 0;
    width: 1px; background: rgba(0,0,0,0.35); z-index: 1;
  }

  /* pill floats at the END of the bar, colour-coded, not dead centre */
  .mobile-eval-pill {
    left: auto; right: 0; top: 50%;
    transform: translate(0, -50%);
    font-size: var(--m-fs-chip);
    line-height: 18px; height: 18px; padding: 0 7px;
    border-radius: 9px;
    background: var(--lic-bg-surface-header);
    border: 1px solid var(--lic-border);
    color: var(--lic-text-bright);
  }
  .mobile-eval-pill[data-side="white"] { color: #e8e6e3; }
  .mobile-eval-pill[data-side="black"] { color: #9aa0a6; }
}
```

Behaviour change: **hide the strip entirely until an analysis exists.** Add
`.mobile-eval-bar.is-idle { display: none !important; }` and toggle `is-idle` wherever the eval is
updated (search for `mobileEvalWhite` writes). Coach mode already hides it (`index.html:2266`).

### 6.5 Player bars — fixes C4

```css
@media (max-width: 599.98px) {
  .lic-player-bar {
    min-height: var(--m-playerbar-h);
    height: var(--m-playerbar-h);
    padding: 0 10px;
    border-radius: var(--m-radius);
    font-size: var(--m-fs-ui);
  }
  .player-name-text {
    font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 52vw;
  }
  /* the persona tagline has no value on a phone */
  #topPlayerMeta, #bottomPlayerMeta { display: none; }
  .player-avatar { width: 20px; height: 20px; }
  .material-piece-icon { width: 12px; height: 12px; }
}
```

Additionally, in `updateCoachPlayerBars()` (`index.html:7397`) render the ELO as a separate chip
element rather than baking it into the name string, so it can be styled/truncated independently:

```js
topPlayerName.textContent = `${p.name} ${p.flag}`;
topPlayerMeta.textContent = p.title;              // hidden on phone by CSS
// new: <span class="player-elo-chip" id="topPlayerElo">1600</span> inside .player-info-main
```

Keep `topPlayerMeta` / `bottomPlayerMeta` in the DOM (CSS-hidden) — desktop still uses them.

### 6.6 Bottom sheet — **new component**, the core of the revamp

This is the surface that replaces the crushed `.col-analysis` / `.col-coach` on phone.

**Markup** — add once, as the last child of `<body>` (before the offcanvas), with the existing
panels *moved into it* (do not duplicate content; relocate the nodes at runtime or in markup):

```html
<div class="m-sheet" id="mobileSheet" data-state="peek" aria-label="Details">
  <div class="m-sheet-grip" id="mobileSheetGrip" role="button" tabindex="0"
       aria-expanded="false" aria-controls="mobileSheetBody">
    <span class="m-sheet-handle" aria-hidden="true"></span>
    <div class="m-sheet-summary" id="mobileSheetSummary">
      <!-- analysis: "12. Nxd5" + quality badge + eval delta
           coach:    avatar + 1-line latest coach message -->
    </div>
    <i class="bi bi-chevron-up m-sheet-chevron" aria-hidden="true"></i>
  </div>
  <div class="m-sheet-body" id="mobileSheetBody"><!-- slot --></div>
</div>
<div class="m-sheet-scrim" id="mobileSheetScrim" hidden></div>
```

**CSS**

```css
@media (max-width: 991.98px) {
  .m-sheet {
    position: fixed; left: 0; right: 0;
    bottom: calc(var(--m-bottombar-h) + var(--safe-bottom));
    z-index: var(--m-z-sheet);
    display: flex; flex-direction: column;
    height: var(--m-sheet-peek-h);
    background: var(--lic-bg-surface);
    border-top: 1px solid var(--lic-border);
    border-radius: var(--m-radius-sheet) var(--m-radius-sheet) 0 0;
    box-shadow: 0 -8px 28px rgba(0,0,0,0.55);
    transition: height 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: height;
    overscroll-behavior: contain;
  }
  .m-sheet[data-state="half"] { height: min(52vh, calc(var(--app-h) * 0.52)); }
  .m-sheet[data-state="full"] { height: calc(var(--app-h) - var(--m-appbar-h) - 56px); }
  .m-sheet.is-dragging { transition: none; }

  .m-sheet-grip {
    flex: 0 0 auto; min-height: var(--m-sheet-peek-h);
    display: grid; grid-template-columns: 1fr auto;
    align-items: center; gap: 10px;
    padding: 10px 14px 8px; cursor: grab;
    touch-action: none;     /* we own the vertical gesture */
  }
  .m-sheet-handle {
    position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
    width: 36px; height: 4px; border-radius: 2px; background: var(--lic-border-strong);
  }
  .m-sheet-body {
    flex: 1; min-height: 0;
    overflow-y: auto; -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 0 14px calc(14px + var(--m-gap));
  }
  .m-sheet[data-state="peek"] .m-sheet-body { display: none; }
  .m-sheet[data-state="full"] .m-sheet-chevron { transform: rotate(180deg); }

  .m-sheet-scrim {
    position: fixed; inset: 0; z-index: var(--m-z-sheet-scrim);
    background: rgba(0,0,0,0.45); opacity: 0;
    transition: opacity 0.2s ease; pointer-events: none;
  }
  .m-sheet-scrim.is-visible { opacity: 1; pointer-events: auto; }
}
@media (min-width: 992px) { .m-sheet, .m-sheet-scrim { display: none !important; } }
```

**Behaviour**

| Gesture / event | Result |
| :--- | :--- |
| Tap grip | `peek ↔ half` |
| Drag grip up/down | Follow finger (set inline `height`, `is-dragging`); on release snap to nearest of peek/half/full by position + velocity (`> 0.5 px/ms` = fling). |
| Swipe down at `full` scroll-top | `full → half → peek` |
| Tap scrim | → `half` |
| Selecting a move (ticker / bottom bar / offcanvas) | auto-open to `half` if currently `peek` |
| Coach posts a new message | flash the peek summary; do **not** auto-expand |
| `Escape` | collapse one step |

**JS contract** (single public helper, so other code stays dumb):

```js
window.MobileSheet = {
  set(state),          // 'peek' | 'half' | 'full'
  get(),               // current state
  setSummary(html),    // writes #mobileSheetSummary
  isMobile()           // matchMedia('(max-width: 991.98px)').matches
};
```

**Content routing** (no duplicated DOM — move nodes on breakpoint change):

| Mode | Sheet body contains |
| :--- | :--- |
| analysis | `.col-analysis .lic-panel-body` (`#moveExplanation`) |
| coach | coach opening strip, `#coachBubble`, `#coachBlunderCard`, coach move list |

Implement with a `relocateForViewport()` function run on load and on breakpoint crossing:
`sheetBody.appendChild(node)` below 992px, `originalParent.appendChild(node)` at/above 992px.
Keep a `WeakMap` of node → original parent. This keeps desktop untouched and keeps every existing
render function writing to the same element IDs.

### 6.7 Bottom action bar — replaces `.mobile-nav-toolbar` / `.coach-action-bar` on phone

One bar, five slots, mode-dependent contents. Keep `#mobileNavToolbar` as the element (IDs are
asserted at `test_browser_modules.js:725-727`); restyle and re-slot it, and render the coach
variant into the same bar rather than into `#coachActionBar` when below 992px.

```css
@media (max-width: 991.98px) {
  .mobile-nav-toolbar {
    position: fixed; left: 0; right: 0; bottom: 0;
    z-index: var(--m-z-bottombar);
    height: calc(var(--m-bottombar-h) + var(--safe-bottom));
    padding: 0 max(var(--m-gutter), var(--safe-left)) var(--safe-bottom) max(var(--m-gutter), var(--safe-right));
    display: grid;
    grid-template-columns: 56px 56px 1fr 56px 56px;
    align-items: center; gap: 4px;
    background: color-mix(in srgb, var(--lic-bg-surface-header) 92%, transparent);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--lic-border);
  }
  .mobile-nav-tool-btn {
    height: var(--m-tap); min-width: var(--m-tap);
    border: none; background: transparent;
    font-size: 1.15rem; border-radius: var(--m-radius);
  }
  .mobile-tool-label { font-size: var(--m-fs-chip); }   /* 11px floor */

  /* centre slot: current-move pill (analysis) or primary action (coach) */
  .mobile-nav-capsule {
    max-width: none; height: var(--m-tap); border-radius: var(--m-radius);
    box-shadow: none; background: var(--lic-bg-surface);
  }
  .mobile-nav-arrow-btn { width: var(--m-tap); height: var(--m-tap); }
  .mobile-nav-move-san { font-size: var(--m-fs-ui); }
  .mobile-nav-move-count { font-size: var(--m-fs-chip); }
}
```

**Slot map**

| Slot | Analysis | Coach |
| :--- | :--- | :--- |
| 1 | `☰ Moves` → opens `#mobileMovesOffcanvas` | `🏳 Resign` (confirm dialog required) |
| 2 | `◀ Prev` | `↺ Undo` (takeback) |
| 3 | move pill `12. Nxd5 / 24 of 61` (tap → sheet `half`) | **`💡 Hint`** — primary, green, **labelled** |
| 4 | `▶ Next` (primary green) | `☰ Moves` |
| 5 | `⚡ Key` + `n/m` badge | `⚙ Coach` (settings modal) |

Fixes **E2** (hint gets a text label and stops being a full-width mystery button) and **E3**
(every coach control is ≥44px). `#btnCoachResign` must open a `confirm()`-equivalent — reuse a
small Bootstrap modal or `window.confirm` — before resigning.

`.coach-action-bar` (`index.html:2848`) is **hidden below 992px**; it remains the desktop surface.
Keep the `#coachActionBar`, `#btnCoachHint`, `#btnCoachResign`, `#btnCoachTakeback`,
`#btnCoachReview` IDs and simply forward the mobile bar's clicks to `.click()` on them, so no
handler logic is duplicated.

### 6.8 Options sheet — **new**, `#mobileOptionsSheet`

A Bootstrap `offcanvas-bottom` opened by `#mobileBtnMore`. Rows (44px each, icon + label + control):

- Analysis depth (`#analysisDepth` relocated, or a mirrored `<select>` that writes to it)
- Playback speed (`#speedControl`, same technique)
- Flip board (`#btnFlip.click()`)
- Import from Lichess / Paste PGN (opens the existing drawer)
- Hide header (`#btnToggleMobileHeader.click()`)
- Keyboard shortcuts (desktop-only note; omit on phone)

This is what empties the app bar and fixes **A3**.

### 6.9 Move surfaces — consolidating D4

Keep **two**, not four:

1. **The pill in the bottom bar** — always-visible current position; tap opens the sheet.
2. **`#mobileMovesOffcanvas`** — the full move sheet, now also used in coach mode.

`#mobileMoveTicker` and `#coachMobileMoveTicker` are **hidden on phone**
(`display: none` inside `@media (max-width: 599.98px)`) but **kept in the DOM and kept rendering**
— `renderMobileMoveTicker` and the `#coachMobileMoveTicker` markup are asserted by the tests
(`test_browser_modules.js:744`, `:1814`, `:1825`). On tablet (600–991px) they stay visible.

Offcanvas restyle:

```css
@media (max-width: 991.98px) {
  .mobile-moves-offcanvas {
    height: min(78vh, calc(var(--app-h) * 0.78)) !important;
    border-radius: var(--m-radius-sheet) var(--m-radius-sheet) 0 0;
    padding-bottom: var(--safe-bottom);
  }
  .mobile-moves-offcanvas .move-pair { min-height: var(--m-tap); }   /* was 28px */
  .mobile-moves-offcanvas .move-cell { font-size: var(--m-fs-ui); }
}
```

### 6.10 Coach speech — fixes E1

Kill the white card. The bubble becomes a themed block inside the sheet.

```css
@media (max-width: 991.98px) {
  body.coach-mode .coach-speech-bubble {
    background: var(--lic-bg-surface-hover);
    color: var(--lic-text-primary);
    border: 1px solid var(--lic-border);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: var(--m-fs-body);
    line-height: 1.5;
    max-height: none;          /* the SHEET scrolls, not the bubble */
    overflow: visible;
  }
  body.coach-mode .coach-bubbles-col::before,      /* white tail */
  body.coach-mode .coach-speech-bubble::before { display: none; }

  /* peek summary clamps to one line; full text lives at half/full */
  .m-sheet[data-state="peek"] #mobileSheetSummary {
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  body.coach-mode .coach-avatar-wrapper { width: 32px; height: 32px; font-size: 18px; }
}
```

> The existing mobile rules `body.coach-mode .coach-speech-bubble` and
> `body.coach-mode .coach-speech-bubble.expanded` must both still appear in the file —
> `test_browser_modules.js:1207-1208` asserts the literal selectors. Keep the `.expanded`
> selector even if it becomes a no-op (give it `max-height: none;`).

### 6.11 Density & type pass (fixes D3, §2.6)

Inside `@media (max-width: 599.98px)`, replace the shrink-everything block at
`index.html:2107-2165` with:

| Element | New value |
| :--- | :--- |
| `.diagnosis-text` | `font-size: var(--m-fs-body); line-height: 1.5; padding: 10px 12px` |
| `.move-san` | `1.125rem` |
| `.badge-q`, `.eval-tag`, `.eval-best-tag`, `.metric-chip` | `font-size: var(--m-fs-chip); padding: 3px 8px` |
| `.diag-tag` | `font-size: var(--m-fs-chip); padding: 3px 8px; min-height: 24px` |
| `.better-move-strip`, `.threat-alert-box` | `font-size: var(--m-fs-ui); padding: 8px 10px` |
| `.variation-box .lic-btn` | `min-height: var(--m-tap); font-size: var(--m-fs-ui)` |
| `.ticker-nav-btn` | `width: var(--m-tap); height: var(--m-tap)` |
| `.var-nav-btn-group .btn-lic-tool` | `width: var(--m-tap); height: var(--m-tap)` |
| `.coach-icon-btn` | `width: var(--m-tap); height: var(--m-tap)` |
| `.ticker-badge` | `font-size: var(--m-fs-chip)` |

Nothing below `--m-fs-chip` (11px). Nothing interactive below `--m-tap`.

---

## 7. Implementation phases

Each phase ends with `node test_browser_modules.js && node test_diagnostics.js` green and a commit.

### Phase 0 — Scaffolding (no visual change yet)
- `index.html:5` — new viewport meta (§4.3).
- `:root` — add all tokens (§4.2).
- Add `syncAppViewport()` + listeners (§6.2); debounce `board.resize()`.
- Add the delimited CSS region at the end of the `<style>` block:
  `/* ===== MOBILE REVAMP v2 — START ===== */ … /* ===== MOBILE REVAMP v2 — END ===== */`.
  All new mobile CSS goes here so cascade order beats the legacy rules without deleting them yet.

### Phase 1 — App bar (A1–A4)
- Fix the `#analysisKeysLegend` class bug at `index.html:7710` and `:7737`.
- Header flex hardening, brand/wordmark rule, `Play Coach` → `Coach`.
- Add `#mobileBtnMore` + `#mobileOptionsSheet` (§6.8); relocate depth/speed/flip/hide-header.
- Restyle `.btn-restore-mobile-header` to a 44px floating circle.

### Phase 2 — Shell & board (B1–B4, C1–C2)
- Delete the three `calc(100dvh - N)` board rules (`index.html:2046`, `:2341`, `:2345`);
  replace with the `--m-chrome-h` formula.
- Fix the bottom bar to `position: fixed` with safe-area padding + blur.
- Coordinate restyle; `touch-action: none` on `.board-container`.

### Phase 3 — Bottom sheet (D1, D2)
- Add `#mobileSheet` markup, CSS, drag/snap JS, `window.MobileSheet` API.
- Implement `relocateForViewport()` node-moving for `#moveExplanation` and the coach nodes.
- Wire: selecting a move opens `half`; coach messages update the peek summary.

### Phase 4 — Bottom bar slots + coach mobile (E1–E3, D4)
- Re-slot `#mobileNavToolbar` into the 5-column grid; add the coach variant that forwards clicks
  to the existing coach buttons.
- Hide `.coach-action-bar` below 992px; label the Hint button; add Resign confirmation.
- Themed coach bubble; hide the two tickers below 600px.

### Phase 5 — Eval strip, player bars, density (C3, C4, D3, §2.6)
- Eval strip redesign + `is-idle` hiding.
- Player bar heights, name truncation, ELO chip, hide taglines.
- Full density/type/touch-target pass.

### Phase 6 — Landscape, cleanup, tests
- Landscape two-column rule (§5.3).
- Remove now-dead legacy rules inside `@media (max-width: 991px)` that the revamp block overrides
  (do this last, one rule at a time, running the suite after each removal).
- Add the new assertions (§9.2).

---

## 8. Files touched

| File | Change |
| :--- | :--- |
| `index.html` | viewport meta, `:root` tokens, new mobile CSS region, new sheet + options-sheet markup, bottom-bar re-slot, `syncAppViewport`, `MobileSheet`, `relocateForViewport`, `#analysisKeysLegend` class fix, `updateCoachPlayerBars` ELO chip. |
| `test_browser_modules.js` | Add the assertions in §9.2. Do not weaken existing ones. |
| `docs/mobile-ui-revamp-plan.md` | This document (update status as phases land). |
| `css/`, `js/`, `img/` | **No changes.** Do not edit the vendored chessboard CSS — override it from `index.html`. |

---

## 9. Test contract

### 9.1 Must not break (existing assertions)

IDs (`test_browser_modules.js:722-728`): `mobileEvalBar`, `mobileEvalWhite`, `mobileEvalPill`,
`mobileMoveTicker`, `tickerScroll`, `tickerNavLeft`, `tickerNavRight`, `mobileNavToolbar`,
`mobileBtnPrev`, `mobileBtnNext`, `mobileBtnKey`, `mobileKeyBadge`, `mobileNavSan`,
`mobileNavCount`, `mobileBtnFlip`, `mobileMovesOffcanvas`, `mobileMovesOffcanvasBody`,
`mobileSheetMoveCount`, plus `coachMobileMoveTicker`.

Literal strings (`:734-748`, `:1207-1208`, `:1825`): `.mobile-eval-bar`, `.mobile-move-ticker`,
`.mobile-nav-toolbar`, `.mobile-nav-capsule`, `.mobile-moves-offcanvas`,
`overflow-y: auto !important;`, `function renderMobileMoveTicker(`, `function syncMobileOffcanvas(`,
`mobileBtnPrev.addEventListener`, `mobileBtnNext.addEventListener`, `mobileBtnKey.addEventListener`,
`mobileBtnFlip.addEventListener`, `body.coach-mode .coach-speech-bubble`,
`body.coach-mode .coach-speech-bubble.expanded`, `body.coach-mode .coach-mobile-move-ticker`.

Also referenced elsewhere in the suite: `#variationBanner`, `#btnTogglePgn`, `#topMaterialDisplay`,
`.var-move-btn`, `.diag-missed-banner`.

> **Rule:** hide legacy elements with CSS; never delete their markup or their rendering functions.

### 9.2 New assertions to add

```js
// Section 10b — Mobile Revamp v2
assert(indexHtml.includes('viewport-fit=cover'),            "viewport must opt into safe areas");
assert(!indexHtml.includes('user-scalable=no'),             "pinch-zoom must not be disabled");
assert(indexHtml.includes('--m-chrome-h'),                  "board height must derive from --m-chrome-h");
assert(!/max-width:\s*min\(100%,\s*calc\(100dvh - \d+px\)\)/.test(indexHtml),
                                                            "no magic-number board heights remain");
assert(indexHtml.includes('function syncAppViewport('),     "must sync --app-h from visualViewport");
assert(indexHtml.includes('MOBILE REVAMP v2 — START'),      "mobile revamp CSS region must be delimited");
['mobileSheet','mobileSheetGrip','mobileSheetBody','mobileSheetSummary','mobileSheetScrim',
 'mobileBtnMore','mobileOptionsSheet'].forEach(id => {
    assert(indexHtml.includes(`id="${id}"`), `Missing mobile element #${id}`);
});
assert(indexHtml.includes('window.MobileSheet'),            "must expose MobileSheet API");
assert(indexHtml.includes('function relocateForViewport('), "must relocate panels between shell and sheet");
assert(indexHtml.includes('.analysis-keys-legend'),         "keys legend must use a dedicated class, not d-none toggling");
assert(!/analysisKeysLegend\.classList\.remove\('d-none'\)/.test(indexHtml),
                                                            "keys legend must not have d-none stripped on mobile");
assert(indexHtml.includes('--m-tap'),                       "touch-target token must exist");
assert(indexHtml.includes('--m-fs-chip'),                   "mobile type floor token must exist");
```

---

## 10. Acceptance criteria

Verify at **320×568**, **390×844** (the screenshot device), **430×932**, **768×1024**, and
**844×390 landscape**, in both modes, in iOS Safari and Android Chrome.

**Layout**
1. No horizontal scrollbar and no clipped control at any width ≥320px.
   (`document.documentElement.scrollWidth === clientWidth`.)
2. App bar fits on one line in both modes; nothing wraps; no keyboard legend on phone.
3. Bottom bar is fully visible above the browser chrome and the home indicator; nothing is
   obscured while the iOS URL bar expands or collapses.
4. Board is square, centred, and never overlaps a player bar or the sheet at `peek`.
5. Rotating the device re-lays out within one frame and re-sizes the board exactly once.

**Sheet**
6. Default state is `peek`; the summary line is readable and truthful in both modes.
7. Drag up/down snaps to peek/half/full with no board reflow (board `getBoundingClientRect()`
   is identical before and after).
8. Sheet content scrolls internally; the page behind never scrolls (`overscroll-behavior` holds).
9. Tapping a move opens the sheet to `half` and shows that move's diagnosis.

**Touch & type**
10. Every interactive element has a ≥44×44 CSS-px hit area (audit with a DevTools script).
11. No rendered text below 11px.
12. Coach Hint button is labelled; Resign asks for confirmation.

**Theme & a11y**
13. No white surfaces; all colours from `--lic-*`.
14. Pinch-zoom works; focus rings visible; the sheet grip is keyboard operable
    (`Enter`/`Space` toggles, `Escape` collapses).
15. Board drag-to-move and click-to-move both still work in coach mode; the page does not scroll
    while dragging a piece.

**Regression**
16. Desktop (≥992px) is pixel-identical to `main` — spot-check the 3-column studio, coach layout,
    variation banner, and move list.
17. `node test_browser_modules.js && node test_diagnostics.js` → 0 failures.

---

## 11. Out of scope

- Any change to `js/*.js` diagnosis, coach, evaluator or analyzer logic.
- New features (cloud sync, accounts, new coach personas, PWA install/offline).
- A design-token refactor of the desktop theme.
- Replacing chessboard.js.

## 12. Risks

| Risk | Mitigation |
| :--- | :--- |
| String-literal tests break on refactor | Phase-by-phase commits, run the suite after every phase; §9.1 is the do-not-touch list. |
| Moving DOM nodes between shell and sheet breaks event handlers | Handlers are bound to the moved elements themselves or delegated from `document`; `appendChild` preserves listeners. Verify coach click-to-move and move-row clicks explicitly. |
| `color-mix()` support on older Safari | Provide a plain `rgba()` fallback declaration immediately before the `color-mix()` one. |
| `backdrop-filter` cost on low-end Android | Acceptable on a single 56px bar; drop to a solid background inside `@media (prefers-reduced-transparency: reduce)`. |
| Sheet drag fighting board drag | Sheet gesture is bound to `.m-sheet-grip` only, with `touch-action: none` scoped to the grip. |
