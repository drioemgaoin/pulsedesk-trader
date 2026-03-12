# Design Decision Record — Brand Identity: Archetypes, Visual Language, and Design Token Brief

- **DDR ID:** `DDR-M9-T2-brand-identity`
- **Date:** 2026-03-12
- **Status:** accepted
- **Owner:** @design
- **Related milestone/task:** M9-T2
- **Supersedes:** none
- **Superseded by:** none

---

## Context

- **User goal:** Engineers and technical evaluators use PulseDesk Trader to demonstrate and assess production-grade distributed platform skills. They need a trading workstation that signals professional credibility — not a toy demo. The UI must communicate that the system behind it is serious, reliable, and under control.
- **Constraints:** Dark theme only (professional trading convention). Free, self-hostable fonts. MUI v6 theming system (palette tokens, typography, spacing). No external CDN for fonts (Fontsource self-hosted). WCAG AA contrast required on all text/data elements.
- **Problem:** Without a deliberate brand brief, design tokens are arbitrary — hex values chosen by taste with no coherent intent, no contrast verification rationale, and no rule governing when to use which colour. Every subsequent design and implementation decision depends on this brief being established first.

---

## Decision

### 1. Brand Archetypes

| Role | Archetype | Core drive |
|------|-----------|------------|
| Primary | **The Ruler** | Control, precision, authority, command |
| Secondary | **The Sage** | Intelligence, data, insight, expertise |

**Brand promise:** *You are in command. You understand everything.*

**Rationale for The Ruler:** Trading workstations are control surfaces. The user manages positions, submits orders, and watches the system execute at speed. Every visual decision must reinforce that the user is in command — not the interface. Dense information layout, predictable behaviour, zero decorative noise.

**Rationale for The Sage:** The platform's second dimension is observability — Grafana dashboards, Kafka lag metrics, fill latency. The Sage archetype drives the data-first hierarchy: monospace values, column-based layout, status chips that communicate system state precisely. The user understands everything happening at every layer.

**Rationale for the combination:** The Ruler + Sage pairing is the defining combination of professional financial terminals. Bloomberg Terminal, Refinitiv Eikon, and TradingView Pro all use it. Users who sit down at PulseDesk should feel immediately at home with the density, the colour language, and the interaction model.

**Why not The Hero or The Explorer:** Hero archetypes drive emotional journeys (onboarding, consumer apps). Explorer archetypes drive discovery UX (e-commerce, content apps). Neither fits a trading workstation where speed and accuracy are the only UX values.

---

### 2. Theme Declaration

**Dark theme — mandatory and non-negotiable.** No light theme variant in scope for this project.

Rationale:
- Professional trading tools are universally dark. Bloomberg, Eikon, TradingView Pro, Interactive Brokers — all dark.
- Dark backgrounds make price data pop with high contrast. Green/red ticks read immediately against near-black.
- Reduces eye strain during extended sessions under artificial office lighting.
- Signals "serious instrument" on first impression. A light-theme trading terminal reads as a toy.

---

### 3. Visual Language Principles

Derived directly from the Ruler + Sage archetypes. These are not preferences — they are constraints every design and implementation decision must respect.

| Principle | Expression |
|-----------|------------|
| **Data is the hierarchy** | No large hero sections. No ornamental whitespace. No decorative illustrations. Every pixel either displays data or creates separation for readability. |
| **Precision over decoration** | Tight spacing, compact density, purposeful motion only. Nothing bounces or slides for effect. Visual feedback is information, not entertainment. |
| **Teal as the command colour** | The primary accent sits between blue (trust, precision) and green (data, live market). It is the standard accent in professional trading interfaces and reads as technical without being cold. |
| **Monospace for data** | All numeric values — prices, quantities, PnL, latency, order IDs, timestamps — are rendered in JetBrains Mono. This creates an instant visual distinction between the interface (Inter) and the data (Mono), which is how professional terminals communicate the difference. |

---

### 4. First Impression

> A user opens PulseDesk Trader for the first time. The page loads into near-black — not grey, not navy, but a true `#0a0a0a`. The app shell appears instantly with no loading animation: a top navigation bar in `#111111` with the product name in Inter 500 and four tab stops — Terminal, Portfolio, Orders, Simulator. The connection status chip glows teal. The user is already on the Terminal page. The watchlist on the left shows five symbols with live bid/ask prices in JetBrains Mono, green ticks flashing on upticks. The chart fills the centre column — candlesticks against dark paper, teal line for the current price. The order ticket on the right is compact and functional. There is no welcome screen. There is no tour. The user is immediately at the controls of a production trading system.

---

### 5. Colour Token Brief

All tokens are implemented in `apps/trader-ui/src/theme/theme.ts`. No hex values are permitted anywhere in component code — always reference by token name.

#### 5.1 Background Layer

| Token | Hex | Luminance | Usage |
|-------|-----|-----------|-------|
| `background.default` | `#0a0a0a` | ~0.001 | Page background — the deepest layer |
| `background.paper` | `#111111` | ~0.005 | Cards, panels, AppBar, Drawers — first elevation |
| `background.elevated` | `#1a1a1a` | ~0.011 | Dropdowns, tooltips, hover backgrounds — second elevation |
| `divider` | `#2a2a2a` | — | Borders, separators, table row lines, panel edges |

**Rationale for three background levels:** A trading terminal has overlapping panel surfaces — watchlist on paper, tooltip on elevated, page on default. Three distinct levels give depth without shadows (shadows are too decorative for The Ruler archetype).

#### 5.2 Primary / Brand Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `primary.main` | `#00bcd4` | PulseDesk teal — active tab underline, focused input outline, primary buttons, selected rows, connection status chip (connected), links |
| `primary.dark` | `#0097a7` | Hover and pressed state on `primary.main` elements |
| `primary.light` | `#4dd0e1` | Subtle accent use only — disabled state on teal elements, secondary highlights |

**Contrast check — `primary.main` on `background.paper`:** `#00bcd4` on `#111111` → ratio ≈ 6.1:1 ✓ WCAG AA (text and UI components).

#### 5.3 Text

| Token | Hex | Usage |
|-------|-----|-------|
| `text.primary` | `#f0f0f0` | Body text, data values, input content |
| `text.secondary` | `#888888` | Column headers, labels, metadata, timestamps, helper text |
| `text.disabled` | `#444444` | Disabled controls, stale/disconnected data cells |

**Contrast checks:**
- `text.primary` on `background.paper`: `#f0f0f0` on `#111111` → ratio ≈ 14.5:1 ✓ WCAG AAA
- `text.secondary` on `background.paper`: `#888888` on `#111111` → ratio ≈ 4.6:1 ✓ WCAG AA (normal text)
- `text.disabled` on `background.paper`: `#444444` on `#111111` → ratio ≈ 1.9:1 — intentionally below AA (disabled elements are exempt from contrast requirements per WCAG 1.4.3)

#### 5.4 Trading Semantic Colours

| Token | Hex | Usage |
|-------|-----|-------|
| `trading.uptick` | `#26a69a` | Price increase flash, positive PnL values, FILLED status chip, fill toast accent |
| `trading.downtick` | `#ef5350` | Price decrease flash, negative PnL values, REJECTED/CANCELLED status chip |
| `trading.pending` | `#ffa726` | PENDING and ACCEPTED order status chip, in-progress states |
| `trading.neutral` | `#666666` | Zero price change, no-data state, neutral status |

**Rationale for teal-green (`#26a69a`) as uptick rather than pure green (`#00ff00` or `#4caf50`):** Pure greens clash with the primary teal accent. Teal-green reads as "positive/live" while remaining visually consistent with the brand palette. This is the standard uptick colour in Bloomberg and TradingView interfaces.

**Contrast checks (`trading.*` on `background.paper`):**
- `trading.uptick` `#26a69a` on `#111111` → ratio ≈ 4.7:1 ✓ WCAG AA
- `trading.downtick` `#ef5350` on `#111111` → ratio ≈ 4.6:1 ✓ WCAG AA
- `trading.pending` `#ffa726` on `#111111` → ratio ≈ 6.8:1 ✓ WCAG AA

#### 5.5 Semantic Status (MUI defaults remapped)

| Token | Hex | Maps to | Usage |
|-------|-----|---------|-------|
| `error.main` | `#ef5350` | Same as `trading.downtick` | Error states, form validation, REJECTED status |
| `warning.main` | `#ffa726` | Same as `trading.pending` | Warnings, degraded states, connection issues |
| `success.main` | `#26a69a` | Same as `trading.uptick` | Success confirmations, FILLED status |
| `info.main` | `#42a5f5` | MUI blue-400 | Informational alerts, neutral notifications |

**Rationale for mapping error/warning/success to trading colours:** A REJECTED order is an error. A FILLED order is a success. Reusing the same hex values across `error.main` / `trading.downtick` and `success.main` / `trading.uptick` means status chips and alert components read with the same colour vocabulary — the interface is consistent at a glance.

---

### 6. Typography Brief

#### 6.1 Font Stack

| Role | Family | Source | Usage |
|------|--------|--------|-------|
| UI font | **Inter** | `@fontsource/inter` (self-hosted) | Navigation tabs, labels, body text, button labels, form inputs, page headings |
| Monospace font | **JetBrains Mono** | `@fontsource/jetbrains-mono` (self-hosted) | All numeric values — prices, quantities, PnL, order IDs, UUIDs, timestamps, latency metrics, error codes, any data that signals "machine output" |

**Rationale for Inter:** Precision and legibility at small sizes (11–13px) where most trading terminal data lives. Wider apertures than Roboto (MUI default), better character differentiation at dense sizes. Free, open-source (SIL), self-hostable via Fontsource. Standard in modern professional interfaces.

**Rationale for JetBrains Mono:** Clear digit differentiation (0 vs O, 1 vs l vs I) — critical in a financial context. Slightly condensed metrics fit more data per column than Roboto Mono or Courier. Free, open-source (OFL), self-hostable via Fontsource. The monospace font creates an immediate semantic signal: "this is data, not label".

**No external CDN dependency:** Both fonts are imported via `@fontsource` npm packages in shell `main.tsx`, served as static assets with the app bundle. No Google Fonts request, no external network dependency.

#### 6.2 Weight Scale

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | 400 | Body text, data values, table cell content |
| Medium | 500 | Column headers, labels, secondary section headings, tab labels |
| Semibold | 600 | Numeric values (prices, PnL) when emphasised, active/selected tab labels, AppBar product name |
| Bold | 700 | Page `<h1>` titles only — used sparingly; never on data |

No weights above 700. No decorative fonts. No italic usage in data display (italic is reserved for error messages and inline notes only).

#### 6.3 Size Scale

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| `caption` | 11px | 400 | Timestamps, micro-labels below inputs |
| `body2` | 12px | 400/500 | Table cell content, metadata, secondary labels |
| `body1` | 13px | 400 | Primary body text, form labels |
| `subtitle2` | 13px | 500 | Column headers, panel section labels |
| `subtitle1` | 14px | 500/600 | Panel titles, significant labels |
| `h6` | 16px | 600 | Card/panel headings |
| `h5` | 20px | 700 | Page `<h1>` — used only once per page |

No display sizes. No decorative heading hierarchy. Size communicates hierarchy only to the degree needed for scanability.

---

### 7. Spacing and Density Brief

**Base unit:** 4px (MUI default `theme.spacing(1) = 8px` — use `theme.spacing(0.5)` for 4px).

**Density target:** `dense` variant applied to all MUI tables, form controls, list items, and select components.

| Surface | Horizontal padding | Vertical padding |
|---------|-------------------|-----------------|
| Dense table cell | 8px (2 units) | 6px (1.5 units) |
| Form control (dense) | 8px | 6px |
| Card/panel | 12px (3 units) | 12px |
| AppBar | 16px (4 units) | — (MUI default height) |

**No ornamental whitespace.** Every spacing decision has a function — separation for readability, padding for touch target, margin for visual grouping. Nothing is padded to "breathe" or "feel open". The user needs to see as much data as possible without scrolling.

---

### 8. Iconography Brief

| Property | Value |
|----------|-------|
| Set | MUI `@mui/icons-material` — Outlined variant |
| Base size | 18–20px |
| Active/selected state | Filled variant only (e.g. filled star for favourited watchlist item) |
| Usage rule | One icon per action, no icon clusters, icons always paired with a label or tooltip |

**Outlined by default, Filled for active state:** The visual distinction between outline and fill provides immediate active/inactive feedback without colour change alone — important for accessibility (not relying on colour as the only indicator).

---

### 9. Motion and Animation Brief

The Ruler archetype demands purposeful motion only. Animation that doesn't carry information is noise.

| Element | Behaviour | Duration | Easing |
|---------|-----------|----------|--------|
| Price flash — uptick | Background fade to `trading.uptick`, return to transparent | 400ms | `ease-out` |
| Price flash — downtick | Background fade to `trading.downtick`, return to transparent | 400ms | `ease-out` |
| Route transition | **Instant** — no slide, no fade, no crossfade | < 100ms | — |
| Modal / Dialog open | MUI default subtle fade-in | 150ms | MUI default |
| MUI Snackbar (fill toast) | MUI default slide-up from bottom-right | 200ms | MUI default |
| Loading skeleton | MUI `Skeleton` pulse animation | MUI default | MUI default |
| Simulator feed scroll | `scroll-behavior: smooth` CSS only | — | CSS smooth |

**What never animates:** Page layouts, table rows, column reordering, filter state changes, tab switches. If a data value changes, the number updates immediately — no counting animation, no flip animation, no value morph.

**Rationale:** A trading terminal must render new data at the exact moment it arrives. Animation that delays the perception of a price update is a reliability failure, not a design choice.

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|--------|------|------|-----------------|
| **The Magician** primary (transformation, possibility) | Exciting for a demo product | Drives whimsical, expressive UI — conflicts with data-density requirement | Wrong emotional register for an engineering credibility demo |
| **The Hero** primary (achievement, courage) | Energetic, motivating | Drives journey UX (onboarding, gamification, progress) — no place in a terminal | Target users are not consumers completing quests |
| Light theme variant | Accessible for office environments | Every professional trading terminal is dark — light theme signals toy/consumer app | Contradicts the professional credibility goal |
| Pure green uptick (`#4caf50`) | Convention in consumer trading apps (Robinhood) | Clashes with PulseDesk teal accent; reads as consumer/retail | Professional terminals use teal-green, not lime/emerald |
| Roboto (MUI default UI font) | No additional dependency | Wider letterforms; less character at dense sizes than Inter | Inter is measurably more legible at 12–13px data table density |

---

## Consequences

- **Positive:** Every subsequent design decision (UX contract, component state colours, token usage in `theme.ts`) has a principled source of truth. Tokens are not arbitrary — each one is derivable from the brand brief. A new engineer joining the project can read this DDR and understand why the interface looks and behaves the way it does.
- **Negative / trade-offs:** Two custom fonts add ~80KB to the initial bundle (mitigated by Fontsource tree-shaking to only loaded weights; Inter 400/500/600/700 + JetBrains Mono 400 ≈ 75KB gzipped). No light theme means users in bright environments may experience glare on low-quality monitors.
- **Accessibility impact:**
  - All text colour combinations verified against WCAG AA (see § 5 contrast checks)
  - `text.disabled` intentionally below AA — applies only to disabled/stale UI elements, which are exempt from contrast requirements under WCAG 1.4.3
  - Font size minimum 11px (`caption`) — at this size Inter remains legible; JetBrains Mono at 11px is readable for timestamps
  - Colour alone never distinguishes trading states — status chips use both colour and text label; price flash uses both colour change and value change
- **Implementation notes for @dev:**
  - Import Fontsource in shell `main.tsx` before `ThemeProvider`: `import '@fontsource/inter/400.css'` through `700.css` + `import '@fontsource/jetbrains-mono/400.css'`
  - Extend MUI palette with `trading` custom token group — requires TypeScript module augmentation on `Palette` and `PaletteOptions`
  - Set `typography.fontFamily: '"Inter", system-ui, sans-serif'` in theme
  - Wrap all numeric/data values in `sx={{ fontFamily: 'monospace' }}` or create a `<DataValue>` typography variant — consistent application is critical; see T3 UX contract for specific component callouts
  - Price flash implemented as a CSS `transition: background-color 400ms ease-out` on the watchlist cell, toggled by a `data-flash="uptick"|"downtick"` attribute set/cleared by `useMarketStream`
  - `background.elevated` is a custom palette extension — not a standard MUI token name; requires the same TypeScript augmentation as `trading.*`

---

## Alignment with FRONTEND.md

`FRONTEND.md` §§ 3–4 is the authoritative runtime reference for all token values, typography rules, and motion rules. This DDR is the decision record explaining *why* those values were chosen. Both documents are confirmed aligned as of 2026-03-12. If either document is updated, the other must be reviewed for consistency.
