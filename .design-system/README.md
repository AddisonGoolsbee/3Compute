# CS Room · Daylight

A warm, paper-toned visual language for CS Room — a free coding classroom built by Birdflop, a 501(c)(3) nonprofit. Daylight diverges from the production dark-only app: it reads as a **scholastic, optimistic, printed-poster** aesthetic — cream paper surfaces, a serif display face, and a small palette of saturated section colors used as accents, never as a single brand hue.

This folder is the design-system handoff: tokens, component reference, and voice rules. Drop it into your project and point Claude Code at it.

---

## What's here

| Path | What it is |
|---|---|
| `README.md` | This file. Voice + visual + iconography rules. |
| `colors_and_type.css` | All design tokens (colors, type, spacing, radius, shadows) + utility classes (`.h-1`, `.body`, `.eyebrow`, etc.). Import once. |
| `ui_kit/` | Click-thru React recreation of core screens (landing, login, IDE, classroom). Open `ui_kit/index.html` in a browser to view. Reference for component patterns. |
| `assets/csroom-logo.svg` | Folded notebook mark used as CS Room's logo. |

---

## Voice & content

**Direct, encouraging, technically literal.** Speaks *to* learners and teachers, never *about* them.

- **Verb-first headlines and CTAs.** "Sign in to start", "Browse lessons", "Donate", "Run", "Re-run". Not "Get Started" or "Discover".
- **Short declarative clauses.** "Class ends, but the code keeps running." "If it runs on Linux, it runs here." "No payment, no trial, no enterprise tier."
- **Specific over abstract.** Use real program names ("Number Guessing Game"), real tools ("Flask, FastAPI"), real numbers when available.
- **Optimistic but never gushing.** No "revolutionize", "unleash", "supercharge". The most aspirational line in production is "Built to spark curiosity."
- **Show generosity loudly.** The fact that everything is free is repeated multiple times in different words. Lean into it.

### Casing
- **Sentence case** for headings, prose, and most buttons. "How it works", "Sign in to start".
- **Title Case** only for proper nouns and product names: `CS Room`, `Birdflop`, `Sign in with Google`.
- **Always `CS Room`** — capital C and R, single space between the words. Never "CSRoom" or "Cs room".
- **Always `Birdflop`** — capital B only.

### Tone in errors and edge states
Lowercase, conversational, never apologetic. `"that code is invalid"`, `"You don't have access to any roles yet."`, `"The name 'archive' is reserved."`

### Emoji
**None.** Zero, anywhere. Visual interest comes from icons (lucide), shapes, and color blocks.

---

## Visual foundations

Daylight is **light-only and paper-toned**. Backgrounds are warm cream, never pure white. Inner surfaces are *lighter* than the page (the inverse of the production dark theme).

### Color system
This is a **multi-color** system, not a one-accent system. Five hues are used as **section accents and identity markers**, not stacked together. Pick one per section/component and stay disciplined.

| Token | Hex | Soft pair | Use |
|---|---|---|---|
| `--c-navy` | `#1f4e79` | `--c-navy-soft` `#d8e3ee` | Default primary CTA. Italic display accents. Links. |
| `--c-tomato` | `#e85d3f` | `--c-tomato-soft` `#fbe1da` | Donate / urgency. Eyebrows. Avatar fill. |
| `--c-ochre` | `#e09733` | `--c-ochre-soft` `#fbecd0` | Featured / highlight. Decorator color in code. |
| `--c-forest` | `#2d6a4f` | `--c-forest-soft` `#d6e6dc` | Success. Lesson authors. Strings in code. |
| `--c-plum` | `#6d3aed` | `--c-plum-soft` `#e5dafa` | Secondary feature accents. Keywords in code. |

**Soft pairs are only ever used as backgrounds for their saturated counterpart** (e.g. ochre text on `ochre-soft` pill). Never mix across families.

### Surfaces
- `--paper` `#fdfaf2` — page background (warm cream)
- `--paper-elevated` `#ffffff` — cards lifted off paper
- `--paper-tinted` `#f5f0e3` — banded sections
- `--paper-deeper` `#ebe4d2` — tertiary
- `--rule` `#d8cfb8` / `--rule-soft` `#e8e1ce` — borders & hairlines

Inner surfaces are *brighter* than outer. Cards on paper use `paper-elevated` (#fff). Sections that need to feel banded sit on `paper-tinted`.

### Ink (text)
- `--ink-strong` `#1a1a1f` — display headings
- `--ink-default` `#2d2d35` — body
- `--ink-muted` `#6b6a6e` — captions, supporting copy
- `--ink-subtle` `#908e8a` — placeholder text
- `--ink-faint` `#b8b4a8` — disabled, very low priority

Pure black is never used. Strong ink is a near-black with warmth.

### Typography
- **Display:** `Newsreader` (Google Fonts, opsz 6–72, weight 600). Serif. Used for h1/h2 only. Classy, scholastic, slightly editorial. Often italicized for inline emphasis (`<span style={{fontStyle:'italic', color:'var(--c-navy)'}}>in your browser</span>`).
- **Sans:** `DM Sans` (Google Fonts, weights 400/500/600/700). Body, h3/h4, UI. Geometric, friendly, neutral.
- **Mono:** `DM Mono` (Google Fonts, 400/500). Terminal, code blocks, captions where appropriate.

Type scale (use the utility classes — don't hand-roll):
- `.h-display` 72px / 1.02 — hero only
- `.h-1` 48px / 1.08 — page heads
- `.h-2` 34px / 1.15 — section heads
- `.h-3` 22px / 1.3 — card heads (sans, not serif)
- `.h-4` 17px / 1.4 — sub-card heads
- `.body-lg` 19px — lead paragraphs
- `.body` 16px — default
- `.body-sm` 14px / muted
- `.caption` 12px / 500
- `.eyebrow` 11px / 600 / uppercase / 0.1em tracking — section labels above h2

### Backgrounds & decoration
- **No imagery, photography, or illustration on backgrounds.**
- **Decoration is geometric paper-cutout shapes** — solid-color circles and rotated rounded squares positioned absolute, often clipping out of the section bounds. Use accent colors at 0.4–0.85 opacity.
- **No gradients on backgrounds.** No glassmorphism. No noise textures.
- **Banded sections** alternate `--paper` and `--paper-tinted`. A "mission band" in `--c-navy` (white text) appears at most once per page.

### Borders, radius, shadow
- **Borders are 1px or 1.5px.** Soft `--rule-soft` for ambient cards, `--rule` for stronger separation, accent `--c-{color}` at full opacity for "owned" cards (a tomato-bordered Teachers card).
- **Radius scale:**
  - `--r-sm` 4px — inline pills, code chips
  - `--r-md` 10px — buttons, inputs, icon backgrounds
  - `--r-lg` 14px — small cards
  - `--r-xl` 20px — content cards
  - `--r-2xl` 28px — large feature cards (the lesson/teacher/student trio)
  - `--r-pill` 999px — pills/badges
- **Shadows are warm-tinted** (rgba(48,32,8, ...)), never neutral grey. Three steps: `--shadow-sm`, `--shadow-md`, `--shadow-lg`. CTAs get `--shadow-cta` (a navy-tinted lift).
- **No inner shadows. No "neumorphism." No glows.**

### Animation & motion
- **Restrained.** Fades in (0.6s ease-out, 8px translate-up) for incoming content. Color/border transitions at 150ms.
- **Hover on buttons:** `transform: translateY(-1px)` plus a tiny `filter: brightness(1.05)`. No bounce, no scale, no springs.
- **The terminal demo on landing types code line-by-line** — that's the only "animated content."
- **No parallax, no scroll-tied animation, no marching-ants.**

---

## Components

The kit in `ui_kit/` shows production-ready React for each. The patterns to copy:

### Buttons
- **Primary:** filled with one of the accent colors (default `--c-navy`), white text, `--shadow-cta`, slight hover lift. `radius: var(--r-md)`. `font-weight: 600`. Padding `11px 20px` (md) or `14px 26px` (lg).
- **Ghost:** transparent, `1.5px solid var(--ink-strong)` border, `--ink-strong` text. On hover: background fades to `--paper-tinted`.
- **Nav link:** transparent / `paper-tinted` when active. Icon + label, `gap: 7px`.

### Pills (badges)
Small pill: `var(--c-{color}-soft)` background, `var(--c-{color})` text, `--r-pill`, 12px / 600. Used for "Students", "Teachers", "Featured" tags above card titles.

### Cards
- **Standard:** `--paper-elevated` bg, `1px solid var(--rule-soft)`, `--r-2xl`, `padding: 28px`. Optional `--shadow-md`.
- **Owned:** same but `1.5px solid var(--c-{color})` (the card is "branded" with the audience's accent).
- **Banded section card** (mission/CTA): `--c-navy` background, white text, decorative shapes clipping out of corners.

### Nav
Sticky `top: 0`, `--paper` background, `1px solid var(--rule-soft)` bottom. Logo left, links right, `Sign in` CTA in `--c-navy`. No transparency, no blur.

### Iconography
**lucide-react** (`https://unpkg.com/lucide@latest` for static HTML). Outline, 16–20px in nav, 22–28px in feature blocks. Inherits currentColor; tinted variants sit inside a `--c-{color}-soft` rounded square (48×48, `--r-md`).

Brand icons (Google, GitHub, Markdown) come from `@icons-pack/react-simple-icons`. Never use lucide for brand glyphs.

**No emoji. No unicode arrows** (use `lucide ArrowRight`/`ChevronRight`).

---

## Spacing scale

Use tokens from `colors_and_type.css`:
`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 24 · `--sp-6` 32 · `--sp-7` 48 · `--sp-8` 64 · `--sp-9` 96.

- Section vertical padding: `--sp-8` to `--sp-9`.
- Section horizontal padding: `28px` (≈`--sp-6`).
- Content max-widths: 720 (prose), 980 (text + sparse visuals), 1180 (hero, feature grids).
- Card internal padding: 28 (large), 20 (medium), 12–16 (compact).

---

## Hard rules (do not break)

1. **Light only.** Never produce a dark version of Daylight.
2. **Cream over white.** `--paper` (#fdfaf2) is the page color. Pure white is reserved for elevated cards.
3. **One accent per section.** Don't paint a card with three colors. Pick navy, tomato, ochre, forest, *or* plum — and pair only with its `-soft` variant.
4. **Serif for h1/h2 only.** Newsreader. Sans (DM Sans) takes over at h3 and below.
5. **No emoji. No backdrop-blur. No gradient backgrounds. No drop-shadow on text. No bouncy animations.**
6. **Iconography is lucide.** Don't draw custom SVG icons.
7. **Casing is sentence case** except for proper nouns and product names.
8. **Italics on display text** are an intentional rhetorical move — use them sparingly (1–2 words per heading) and always on an accent color.
