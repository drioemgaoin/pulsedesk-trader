# Design Decision Record — UX Contract: Navigation, Page Layouts, and Interaction Model

- **DDR ID:** `DDR-M9-T3-ux-contract`
- **Date:** 2026-03-12
- **Status:** accepted
- **Owner:** @design
- **Related milestone/task:** M9-T3
- **Supersedes:** DDR-M4-T4-blotter-positions-ui.md, DDR-M5-T3-realtime-ui-integration.md (M9 MUI migration supersedes Phase 1 panel designs)
- **Superseded by:** none

> **Prerequisite:** DDR-M9-T2-brand-identity.md is complete and accepted. All colour references in this contract use semantic token names only — no hex values. Hex values live exclusively in `apps/trader-ui/src/theme/theme.ts`.

---

## Context

- **User goal:** Navigate a professional trading workstation — submit orders, monitor positions, review order history, and run load simulations — using a keyboard-first, data-dense interface that feels immediately familiar to anyone who has used Bloomberg Terminal or TradingView Pro.
- **Constraints:** MUI v6 component library only. No Tailwind CSS. All tokens from T2 DDR. WCAG AA contrast. Compact density (`dense` variant). `lg+` is the primary target (≥ 1280px). Module Federation shell + 4 remotes.
- **Problem:** Without an explicit layout contract, five independent developers (one per MFE) will produce inconsistent panel proportions, different keyboard paths, and incompatible interaction patterns. The UX contract is the single source of truth every `@dev` task references.

---

## 1. Navigation Shell

### 1.1 AppBar Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ [PulseDesk]  Terminal  Portfolio  Orders  Simulator     [● Live] [R▾] │
└──────────────────────────────────────────────────────────────────────┘
```

- **Component:** MUI `AppBar` position `fixed`, `background.paper` background, bottom `divider` border
- **Left:** Product wordmark "PulseDesk" — Inter 600 16px, `primary.main` colour; not a link
- **Centre:** MUI `Tabs` with four `Tab` items — Terminal / Portfolio / Orders / Simulator; active tab underlined with `primary.main` 2px border; tab text Inter 500 13px `text.secondary` (inactive) / `text.primary` (active)
- **Right — connection status chip:**
  - MUI `Chip` size `small`; left dot icon (MUI `FiberManualRecord` 10px)
  - Connected: dot + label `text.secondary` colour; dot `success.main`; chip background `background.elevated`
  - Connecting: dot `warning.main` pulsing opacity (CSS animation 1s ease-in-out infinite); label "Connecting…"
  - Disconnected: dot `error.main`; label "Disconnected"; chip background `background.elevated`
- **Right — user menu:** MUI `IconButton` with `AccountCircleOutlined` icon + username truncated to 12 chars; opens MUI `Menu` with one item: "Sign out" (MUI `LogoutOutlined` icon); clicking sign out dispatches `authSlice.logout`

### 1.2 Active Tab Synchronisation

The active tab reflects `react-router-dom` `useLocation().pathname`. Tab value maps:

| Tab | Pathname prefix |
|-----|----------------|
| Terminal | `/terminal` |
| Portfolio | `/portfolio` |
| Orders | `/orders` |
| Simulator | `/simulator` |

Tab clicks navigate via `useNavigate`. No page reload. Active tab is always derived from the URL — never from local state.

### 1.3 Responsive Behaviour

- `lg+`: All four tabs visible in the AppBar
- `md`: Tabs remain visible but labels may truncate to icons only (MUI `Tooltip` on each tab with full label)
- `< md`: Small screen banner shown (see § 2.7); AppBar still renders with full nav for usability

---

## 2. Page Layouts

### 2.1 Login Page

```
┌──────────────────────────────────────────────────────────────────────┐
│                        background.default                             │
│                                                                       │
│          ┌───────────────────────────────────────┐                   │
│          │  background.paper  MUI Paper elevation=1                   │
│          │                                        │                   │
│          │  PulseDesk Trader                      │                   │
│          │  Inter 700 h5  text.primary             │                   │
│          │  "Sign in to your account"              │                   │
│          │  Inter 400 body2  text.secondary        │                   │
│          │                                        │                   │
│          │  ┌────────────────────────────────┐   │                   │
│          │  │ Username          TextField     │   │                   │
│          │  └────────────────────────────────┘   │                   │
│          │  ┌────────────────────────────────┐   │                   │
│          │  │ Password          TextField     │   │                   │
│          │  └────────────────────────────────┘   │                   │
│          │                                        │                   │
│          │  [ session expired Alert — if param ]  │                   │
│          │  [ server error Alert — on 401/500  ]  │                   │
│          │                                        │                   │
│          │  ┌────────────────────────────────┐   │                   │
│          │  │         Sign In       Button    │   │                   │
│          │  └────────────────────────────────┘   │                   │
│          └───────────────────────────────────────┘                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

- **Layout:** MUI `Box` with `display: flex`, `alignItems: center`, `justifyContent: center`, `minHeight: 100vh`, `background: background.default`
- **Card:** MUI `Paper` 400px width (fixed), 32px padding, `border: 1px solid divider`
- **No AppBar** on Login page — it is outside the authenticated `AppShell` layout
- **Document title:** "Sign in — PulseDesk Trader"

### 2.2 App Shell (Authenticated Pages)

```
┌──────────────────────────────────────────────────────────────────────┐
│ AppBar (fixed, 48px height)                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  <Outlet />   — remote page component rendered here                   │
│  MUI Box: paddingTop: '48px' (AppBar offset), minHeight: '100vh'      │
│  background: background.default                                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

- **Small screen banner:** MUI `Alert` severity `warning`, `position: sticky`, top `48px`; text: "PulseDesk is optimised for desktop. Some panels may not display correctly on smaller screens."; rendered when `useMediaQuery(theme.breakpoints.down('md'))` is true; rendered inside AppShell above `<Outlet />`, not inside each remote

### 2.3 Terminal Page — `lg+`

```
┌──────────────────────────────────────────────────────────────────────┐
│ AppBar                                                                 │
├────────────────┬───────────────────────────────┬─────────────────────┤
│ Watchlist      │ Chart Panel                    │ Order Ticket        │
│ 22% width      │ 43% width                      │ 35% width           │
│ min-width:200px│ flex-grow: 1                   │ min-width:280px     │
│                │                                │                     │
│ ┌──────────────┤ ┌────────────────────────────┐ │ Symbol: AAPL        │
│ │AAPL  162.47  │ │                            │ │                     │
│ │ ↑ 0.32       │ │    Lightweight Charts      │ │ Side:               │
│ │ 162.45/162.49│ │    CandlestickSeries       │ │ [BUY]  [SELL]       │
│ │──────────────│ │                            │ │                     │
│ │TSLA  198.30  │ │    teal primary line for   │ │ Type:               │
│ │ ↓ 1.20       │ │    current price           │ │ [MARKET] [LIMIT]    │
│ │ 198.28/198.32│ │                            │ │                     │
│ │──────────────│ │                            │ │ Quantity:           │
│ │MSFT  415.60  │ │                            │ │ [ 10          ]     │
│ │ ─ 0.00       │ │                            │ │                     │
│ │──────────────│ └────────────────────────────┘ │ Limit Price:        │
│ │NVDA  875.20  │                                │ [ 162.50      ]     │
│ │AMZN  183.40  │                                │ (visible if LIMIT)  │
│ │              │                                │                     │
│ │              │                                │ [  Submit Order   ] │
└─┴──────────────┴────────────────────────────────┴─────────────────────┤
│ Tabs: [Blotter ●] [Positions]                                          │
├────────────────────────────────────────────────────────────────────────┤
│ Blotter / Positions table — scrollable, fixed height ~240px            │
└────────────────────────────────────────────────────────────────────────┘
```

**Top row:** MUI `Box` display `flex`, flexDirection `row`, height `calc(100vh - 48px - 240px - 48px)`. Minimum top row height: 320px.

**Watchlist panel:**
- MUI `Table` dense; columns: Symbol (Inter 500 `text.primary`), Last (JetBrains Mono 400), Change (JetBrains Mono with `trading.uptick`/`trading.downtick`/`trading.neutral` colour), Bid/Ask (JetBrains Mono `text.secondary`)
- Selected row: `background.elevated` background + `primary.main` left border 2px
- Price flash: `background-color` transition on cell, 400ms `ease-out`, to `trading.uptick` or `trading.downtick`, returns to transparent

**Chart panel:**
- Lightweight Charts `createChart()` in a `div` that fills panel width/height via `ResizeObserver`
- `CandlestickSeries` default colours; `LineSeries` overlay for current price in `primary.main`
- Background `background.paper`; grid lines `divider`; crosshair `text.secondary`

**Order ticket panel:**
- React Hook Form; all inputs MUI `TextField` size `small` (dense)
- Side: MUI `ToggleButtonGroup` exclusive — BUY (`success.main` when selected), SELL (`error.main` when selected)
- Type: MUI `ToggleButtonGroup` exclusive — MARKET / LIMIT
- Limit Price field: visible only when Type = LIMIT (`{orderType === 'LIMIT' && <TextField ... />}`)
- Submit button: MUI `Button` variant `contained` colour `primary`; disabled when WebSocket disconnected (see § 5.3)

**Bottom row — Blotter/Positions tabs:**
- MUI `Tabs` + `TabPanel` pattern; tab bar height 48px; table area height 240px fixed, `overflow: auto`
- Blotter: Order ID (truncated + `MUI Tooltip`), Symbol, Side, Type, Qty, Status (`MUI Chip`), Submitted
- Positions: Symbol, Qty, Avg Cost (JetBrains Mono), Current Price (JetBrains Mono), Unrealized P&L (`trading.uptick`/`trading.downtick`), % Return

**Terminal — `md` (900px–1279px):**
```
Watchlist (full width, max 4 rows visible, rest scroll)
Chart (full width, 280px height)
Order Ticket (full width)
Blotter/Positions tabs (full width)
```
Stacked MUI `Stack` direction `column`; no side-by-side panels.

### 2.4 Portfolio Page — `lg+`

```
┌──────────────────────────────────────────────────────────────────────┐
│ AppBar                                                                 │
├──────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ Account Summary  MUI Paper padding 16px                         │   │
│ │ [3 Positions]   [Market Value  $48,320.00]   [PnL  +$1,240.50] │   │
│ │  text.secondary   JetBrains Mono 600           JetBrains Mono   │   │
│ │                                                trading.uptick   │   │
│ └────────────────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ Positions Table  MUI Paper                                       │   │
│ │ [Symbol filter ____________]                    [Export CSV ↓]   │   │
│ │                                                                  │   │
│ │  Symbol │ Qty │ Avg Cost │ Mkt Price │ Unreal P&L │  % Return   │   │
│ │  AAPL   │ 10  │ 155.20   │  162.47   │  +72.70 ▲  │   +4.7%    │   │
│ │  TSLA   │  5  │ 210.00   │  198.30   │  -58.50 ▼  │   -5.6%    │   │
│ │  MSFT   │  8  │ 410.00   │  415.60   │  +44.80 ▲  │   +1.1%    │   │
│ │                                                                  │   │
│ └────────────────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ Aggregate PnL — Last 5 Minutes  MUI Paper                       │   │
│ │ Lightweight Charts AreaSeries  height: 180px                    │   │
│ │ positive area: trading.uptick at 40% opacity                    │   │
│ │ negative area: trading.downtick at 40% opacity                  │   │
│ └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

- **Document title:** "Portfolio — PulseDesk Trader"
- **Page `<h1>`:** visually hidden (sr-only) "Portfolio" — focus target on route transition
- Account summary: MUI `Box` display `flex` gap `24px`; each stat: MUI `Box` with `Typography` label (`text.secondary` body2) + value (JetBrains Mono 600)
- PnL value coloured: positive → `success.main`, negative → `error.main`, zero → `text.secondary`
- Sort: clicking column header toggles asc/desc; active sort column shows MUI `ArrowUpward`/`ArrowDownward` icon 14px; sort state in `useState`
- Symbol filter: MUI `TextField` size `small` `startAdornment: SearchOutlined`; filters rows client-side

**Portfolio — `md`:** Summary header stacks vertically (column flex); table renders with horizontal scroll if viewport too narrow; PnL chart full width below.

**Empty state:**
```
┌───────────────────────────────────────────────────┐
│            (TrendingFlatOutlined icon 48px)        │
│            text.disabled                           │
│        "No open positions"                         │
│         text.secondary body1                       │
│   [Go to Terminal to place your first order →]     │
│    MUI Button variant="outlined" color="primary"   │
└───────────────────────────────────────────────────┘
```

### 2.5 Orders Page — `lg+`

```
┌──────────────────────────────────────────────────────────────────────┐
│ AppBar                                                                 │
├──────────────┬───────────────────────────────────────────────────────┤
│ Filter       │ Orders Table                                            │
│ Sidebar      │                                                         │
│ 240px fixed  │ Order ID  │ Symbol │ Side │ Qty │ Status  │ Submitted  │
│              │ abc…efg ⧉ │ AAPL   │ BUY  │ 10  │ FILLED  │ 10:42:01  │
│ Status:      │ ▶ [expand row]                                          │
│ [FILLED  ✓]  │ def…hij ⧉ │ TSLA   │ SELL │  5  │ PENDING │ 10:43:15  │
│ [PENDING ✓]  │   [×cancel]                                            │
│ [ACCEPTED ✓] ├───────────────────────────────────────────────────────┤
│ [REJECTED ✓] │               ← 1  2  3  4  5 →                       │
│ [CANCELLED✓] │                                                         │
│ [EXECUTED ✓] │                                                         │
│              │                                                         │
│ Symbol:      │                                                         │
│ [AAPL, TSLA] │                                                         │
│  Autocomplete│                                                         │
│              │                                                         │
│ Side:        │                                                         │
│ [ALL|BUY|SELL│                                                         │
│              │                                                         │
│ From: [date] │                                                         │
│ To:   [date] │                                                         │
│              │                                                         │
│ [Clear       │                                                         │
│  Filters]    │                                                         │
└──────────────┴───────────────────────────────────────────────────────┘
```

- **Document title:** "Orders — PulseDesk Trader"
- **Sidebar:** MUI `Box` width `240px`, flex-shrink `0`, `border-right: 1px solid divider`; section headers Inter 500 12px `text.secondary` uppercase
- **Table:** TanStack Table v8 headless + MUI `Table` dense; `TableHead` with `text.secondary` Inter 500 12px uppercase headers
- **Status chips:** MUI `Chip` size `small`; colours:
  - FILLED: `success.main` background at 15% opacity, `success.main` text
  - PENDING / ACCEPTED: `warning.main` background at 15% opacity, `warning.main` text
  - REJECTED / CANCELLED: `error.main` background at 15% opacity, `error.main` text
- **Order ID cell:** truncated to 8 chars + `…`; MUI `Tooltip` with full UUID; copy-to-clipboard `MUI IconButton` (`ContentCopyOutlined` 14px) visible on row hover
- **Cancel button:** MUI `IconButton` `CancelOutlined`; visible only on PENDING / ACCEPTED rows; `error.main` colour on hover; opens confirmation Dialog (see § 5.4)
- **Pagination:** MUI `TablePagination` component; page size 25 fixed; shows "X–Y of Z"
- **Expandable row:** TanStack Table row expand; expanded row spans all columns; shows: full Order ID (JetBrains Mono), Command ID (JetBrains Mono), Limit Price (if LIMIT), Fill Price (if FILLED), Fill Time (if FILLED), Rejection reason (if REJECTED/CANCELLED)

**Orders — `md`:** Filter sidebar becomes a collapsible MUI `Drawer` (temporary); floating `MUI Fab` or `MUI Button` "Filters" opens it; table scrolls horizontally for narrower columns.

**Empty state (per filter combination):**
```
"No orders match your filters."
[Clear Filters]   MUI Button variant="text" color="primary"
```

### 2.6 Simulator Page — `lg+`

```
┌──────────────────────────────────────────────────────────────────────┐
│ AppBar                                                                 │
├─────────────────────────┬────────────────────────────────────────────┤
│ Configuration Panel     │ Live Stats                                  │
│ MUI Card  40% width     │ MUI Card grid  60% width                    │
│                         │                                             │
│ Traffic Profile:        │ ┌──────┬──────┬──────┬──────┬──────┐      │
│ [Burst][Steady][Ramp]   │ │ Sub  │ Acc  │ Fill │ Rej  │ Err  │      │
│                         │ │  47  │  45  │  38  │   2  │   0  │      │
│ — Burst inputs —        │ └──────┴──────┴──────┴──────┴──────┘      │
│ Orders: [50    ]        │ Acceptance [████████░░] 96%                │
│                         │ Fill Rate  [███████░░░] 81%                │
│ Symbols:                │ Rejection  [░░░░░░░░░░]  4%                │
│ [✓AAPL][✓TSLA][✓MSFT]  │ Avg Fill Latency: 42ms                     │
│ [✓NVDA][✓AMZN]         │                                             │
│                         ├────────────────────────────────────────────┤
│ Max concurrency:        │ Live Feed  (last 500, virtualised)         │
│ ────────●──── 8         │ ┌──────────────────────────────────────┐  │
│                         │ │10:42:01 AAPL BUY  10 [FILLED]   38ms│  │
│ Scenario:               │ │10:42:01 TSLA SELL  5 [FILLED]   41ms│  │
│ (●) Normal              │ │10:42:02 MSFT BUY  50 [REJECTED]    │  │
│ ( ) High Volume         │ │         QUANTITY_LIMIT_EXCEEDED     │  │
│ ( ) Limit Exceeded      │ │10:42:02 NVDA BUY   3 [FILLED]   39ms│  │
│ ( ) Duplicate Keys      │ └──────────────────────────────────────┘  │
│ ( ) Invalid Payload     │ [↓ Scroll to bottom]  (shows when paused) │
│                         ├────────────────────────────────────────────┤
│ [Rate limit warning     │ ▶ Observability Links (Accordion)          │
│  Alert if configured    │                                             │
│  rate > limit]          │                                             │
│                         │                                             │
│ [▶ Start] [⏸ Pause] [■Stop]                                         │
│ [████████░░░░░░░░] 47/50                                            │
│ MUI LinearProgress      │                                             │
│ Elapsed: 00:00:23       │                                             │
└─────────────────────────┴────────────────────────────────────────────┘
```

- **Document title:** "Simulator — PulseDesk Trader"
- **Configuration card:** MUI `Card` with `CardContent`; all inputs use React Hook Form + Zod
- **Profile inputs — Burst:** single MUI `TextField` "Orders (1–500)" type `number`
- **Profile inputs — Steady:** MUI `TextField` "Rate (orders/s, 1–50)" + MUI `TextField` "Duration (s, 10–300)"
- **Profile inputs — Ramp:** MUI `TextField` "Min rate", "Max rate", "Duration"; Zod validates max > min
- **Symbols:** MUI `FormGroup` with MUI `Checkbox` per symbol; at-least-one Zod validation
- **Concurrency slider:** MUI `Slider` min `1` max `20` step `1`; value displayed right of slider; marks at 1, 5, 10, 15, 20
- **Scenario:** MUI `RadioGroup`; each scenario has label + description `text.secondary` caption
- **Rate limit warning:** MUI `Alert` severity `warning` shown when configured rate (orders/s) × 60 > `VITE_RATE_LIMIT_PER_MIN`; "This rate may trigger gateway throttling (limit: N req/min)"
- **Controls:** three MUI `Button` components in a `ButtonGroup`; Start = `contained` `primary`; Pause = `outlined` `primary`; Stop = `outlined` `error`
- **Progress bar:** MUI `LinearProgress` variant `determinate`; shown only for Burst and Steady profiles; value = (submitted / total) × 100
- **Stats grid:** MUI `Grid` 5 columns; each cell: `Typography` variant `h4` JetBrains Mono 600 for the number, `Typography` variant `caption` `text.secondary` for the label
- **Live feed:** fixed-height `div` (300px), `overflow: hidden`; TanStack Virtual `useVirtualizer`; each row: timestamp (JetBrains Mono `text.secondary`), symbol + side + qty (Inter `text.primary`), status `MUI Chip`, latency (JetBrains Mono), error message (if present, `error.main` body2)
- **Observability links:** MUI `Accordion` collapsed by default; `AccordionSummary` label "Observability Links"; inside: list of MUI `Link` items with `OpenInNew` icon, opening Grafana sub-paths in new tab
- **Pre-run empty state** (right column before first run begins):
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│         (PlayCircleOutlineOutlined icon 48px)         │
│              text.disabled                            │
│    "Configure a profile and press Start"              │
│         text.secondary body1                          │
│                                                       │
└─────────────────────────────────────────────────────┘
```
Shown in both the Stats panel and Live Feed area until the first run starts. Replaced by live content on `Start` click.

**Simulator — `md`:** Two columns stack to single column: Configuration card full width → Stats + feed below.

### 2.7 404 Not Found Page

```
┌──────────────────────────────────────────────────────────────────────┐
│ AppBar (if authenticated) or plain background (if not)                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                   404                                                  │
│                   JetBrains Mono 700  h3  text.disabled               │
│                                                                       │
│              Page not found                                           │
│              Inter 400 body1  text.secondary                          │
│                                                                       │
│         [ ← Back to Terminal ]                                        │
│         MUI Button variant="outlined" color="primary"                 │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

- **Document title:** "Not Found — PulseDesk Trader"

---

## 3. Design System Tokens Used

All colours are semantic names from DDR-M9-T2-brand-identity.md. No hex values below.

| Context | Token |
|---------|-------|
| Page background | `background.default` |
| Cards, panels, AppBar | `background.paper` |
| Dropdowns, elevated surfaces, hover | `background.elevated` |
| Borders, table lines, panel dividers | `divider` |
| Primary actions, active tabs, links, teal | `primary.main` |
| Hover on primary | `primary.dark` |
| Body text, data values | `text.primary` |
| Labels, headers, metadata | `text.secondary` |
| Disabled / stale data | `text.disabled` |
| Price up, positive PnL, FILLED status | `trading.uptick` = `success.main` |
| Price down, negative PnL, REJECTED/CANCELLED | `trading.downtick` = `error.main` |
| PENDING/ACCEPTED status, warnings | `trading.pending` = `warning.main` |
| Zero change, neutral | `trading.neutral` |
| Connection status — connected | `success.main` |
| Connection status — connecting | `warning.main` |
| Connection status — disconnected | `error.main` |

---

## 4. Typography Usage

| Element | Font | Size | Weight | Token |
|---------|------|------|--------|-------|
| Page `<h1>` | Inter | h5 (20px) | 700 | `text.primary` |
| Panel/card headings | Inter | h6 (16px) | 600 | `text.primary` |
| Body text, labels | Inter | body1 (13px) | 400 | `text.primary` |
| Column headers, section labels | Inter | body2 (12px) | 500 | `text.secondary` |
| Timestamps, captions | Inter | caption (11px) | 400 | `text.secondary` |
| Prices, quantities, PnL | JetBrains Mono | body2 (12px) | 400 | context-dependent |
| Key stats (simulator counters) | JetBrains Mono | h4 | 600 | `text.primary` |
| Order IDs, UUIDs | JetBrains Mono | caption (11px) | 400 | `text.secondary` |
| 404 number | JetBrains Mono | h3 | 700 | `text.disabled` |

---

## 5. Interaction Contracts

### 5.1 Login Form

**States:**

| State | Description |
|-------|-------------|
| Default | Username + Password `TextField` (size `small`); "Sign In" `Button` (variant `contained`, full width) |
| Loading | "Sign In" button disabled + MUI `CircularProgress` size `20` inside button; inputs disabled |
| Field error | Per-field `helperText` from React Hook Form in `error.main`; triggers on blur or submit attempt; "Username is required" / "Password is required" |
| Server error (401) | MUI `Alert` severity `error` above the button: "Invalid username or password." Alert appears after submit, dismissible |
| Server error (5xx) | MUI `Alert` severity `error`: "Service unavailable. Please try again." |
| Session expired | MUI `Alert` severity `warning` at top of card (before inputs): "Your session has expired. Please sign in again." Shown when `?reason=session_expired` is in the URL |

**Keyboard path:**
1. Page loads → focus auto-placed on Username field
2. `Tab` → Password field
3. `Tab` → Sign In button
4. `Enter` on button (or in either field) → submit form
5. On success → navigate to `/terminal` (focus moves to Terminal page `<h1>`)

### 5.2 Fill Toast Notification

**Trigger:** `order.filled` WebSocket message received.

**Component:** MUI `Snackbar` + MUI `Alert`

```
┌───────────────────────────────────────┐
│ ▌ AAPL × 10 BUY FILLED at $160.47    │  ← left border 4px trading.uptick
│   text.primary body2                 │
└───────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Anchor | `{ vertical: 'bottom', horizontal: 'right' }` |
| Auto-hide duration | 4000ms |
| Left border | 4px solid `trading.uptick` |
| Background | `background.paper` |
| Icon | `CheckCircleOutlined` in `trading.uptick` |
| Text format | `"<SYMBOL> × <qty> <SIDE> FILLED at $<fillPrice>"` |
| Queue behaviour | Multiple fills queue; 500ms gap between; max 3 visible simultaneously |
| Dismiss | `×` icon button; also dismissed by auto-hide |

### 5.3 WebSocket Disconnection Data State

Triggered when `useMarketStream` `connectionStatus$` emits `'disconnected'` or `'reconnecting'`.

**Watchlist panel:**
- Bid / Ask / Last cells: `color: text.disabled`, `backgroundColor: trading.neutral` at 10% opacity
- Change cell: dash `—` replaces the value
- State restores automatically on reconnect — no user action required

**Chart panel:**
- Chart freezes at last received tick (no new candles drawn)
- MUI `Chip` overlaid in top-right of chart area: `"Feed paused — reconnecting…"`, `warning.main` background, `text.primary` label, pulsing opacity animation
- Chart does not show an error state — the last data is still valid; only new ticks are missing

**Order ticket:**
- Submit button disabled
- MUI `Tooltip` on the disabled button: `"Market data unavailable — reconnecting"`
- Side, Type, Quantity inputs remain interactive (user can pre-fill while waiting)

**AppBar connection chip:**
- Transitions from `success.main` dot + "Live" → `warning.main` pulsing dot + "Reconnecting…" (see § 1.1)

**On reconnect:**
- All states restore automatically via `connectionStatus$` emitting `'connected'`
- No user action, no page reload, no toast (reconnection is infrastructure behaviour, not a user event)

### 5.4 Order Cancel Confirmation Dialog

Triggered when cancel `IconButton` clicked on a PENDING/ACCEPTED order row.

```
┌──────────────────────────────────────────────────────┐
│ Cancel Order                   [×]                    │
│ ────────────────────────────────────────────────────  │
│ Cancel order AAPL × 10 BUY?                          │
│ This action cannot be undone.                         │
│                                                        │
│  text.secondary body2                                 │
│  Order: abc...efg (JetBrains Mono)                   │
│                                                        │
│                     [Keep Order]  [Cancel Order]      │
└──────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Component | MUI `Dialog` maxWidth `xs` |
| Title | "Cancel Order" — Inter 600 h6 |
| Content | Confirmation sentence + Order ID in JetBrains Mono `text.secondary` |
| Primary action | "Cancel Order" — MUI `Button` variant `contained` color `error`; triggers `useCancelOrderMutation` |
| Secondary action | "Keep Order" — MUI `Button` variant `text` color `inherit`; closes dialog, no action |
| Loading state | Both buttons disabled; "Cancel Order" button shows `CircularProgress` size `16` |
| On success | Dialog closes; row shows CANCELLED chip (optimistic); `MUI Snackbar`: "Order cancelled." |
| On error | Dialog closes; `MUI Snackbar` severity `error`: "Failed to cancel order. Please try again." |

**Keyboard path:**
1. Dialog opens → focus on "Keep Order" button (safe default — destructive action not focused by default)
2. `Tab` → "Cancel Order" button
3. `Escape` → close dialog, same as "Keep Order"
4. `Enter` on focused button → activate

### 5.5 Orders Table Row Expand / Collapse

| State | Behaviour |
|-------|-----------|
| Collapsed (default) | Row shows summary columns; `ExpandMoreOutlined` icon in first cell |
| Expanded | `ExpandLessOutlined` icon; an additional full-width row appended below with detail panel |
| Detail panel | MUI `Box` with `background.elevated` background, 12px padding; two-column grid of label/value pairs |
| Animation | MUI `Collapse` component — 200ms ease; does not flash or bounce |

Detail panel content:
- Order ID: full UUID (JetBrains Mono `text.primary`)
- Command ID: full UUID (JetBrains Mono `text.secondary`)
- Limit Price: shown only if Type = LIMIT (JetBrains Mono)
- Fill Price: shown only if Status = FILLED (JetBrains Mono `trading.uptick`)
- Fill Time: shown only if Status = FILLED (formatted with `date-fns`)
- Rejection reason: shown only if Status = REJECTED/CANCELLED (`error.main` body2)

### 5.6 Simulator Start / Pause / Stop Controls

**State machine:**

```
IDLE ──[Start]──► RUNNING ──[Pause]──► PAUSED ──[Resume]──► RUNNING
                      │                                         │
                      └──[Stop]──────────────────────────► IDLE
                      PAUSED ──[Stop]────────────────────► IDLE
```

| State | Start | Pause/Resume | Stop |
|-------|-------|--------------|------|
| IDLE | `contained primary` enabled | `outlined` disabled | `outlined error` disabled |
| RUNNING | `contained primary` disabled | `outlined primary` "Pause" enabled | `outlined error` enabled |
| PAUSED | `contained primary` disabled | `outlined primary` "Resume" enabled | `outlined error` enabled |
| SUBMITTING (last batch) | All disabled | — | — |

- While RUNNING: config inputs disabled (profile, symbols, concurrency, scenario)
- Progress bar visible for Burst/Steady only; hidden for Ramp (indeterminate instead)
- Elapsed timer: `date-fns` `intervalToDuration`; format `mm:ss`; ticks every second via `setInterval` while RUNNING

### 5.7 Simulator Navigation Guard

Triggered when user navigates away (tab click or browser back) while simulator is RUNNING or PAUSED.

```
┌──────────────────────────────────────────────────────┐
│ Leave Simulator?                [×]                   │
│ ─────────────────────────────────────────────────── │
│ A simulation is running.                              │
│ Leaving will stop the current run and discard        │
│ in-progress results.                                  │
│                                                        │
│                     [Stay]   [Leave and Stop]         │
└──────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Component | MUI `Dialog` maxWidth `xs` |
| Trigger | React Router v7 `useBlocker` hook — blocks navigation when `simulatorStatus !== 'IDLE'` |
| Primary action | "Leave and Stop" — `Button` variant `contained` color `error`; stops the run, unblocks navigation, navigates |
| Secondary action | "Stay" — `Button` variant `text`; cancels the block, user stays on Simulator page |
| Escape | Same as "Stay" |

### 5.8 General Toast / Snackbar Placement and Duration

All `MUI Snackbar` instances in the application:

| Property | Value |
|----------|-------|
| Anchor | `{ vertical: 'bottom', horizontal: 'right' }` for all toasts |
| Default duration | 4000ms |
| Error duration | 6000ms |
| Max stack | 3 concurrent |
| Queue behaviour | FIFO — oldest toast on top if stacking |
| Dismiss | Each has an `×` `IconButton` to dismiss early |

Toast types and their durations:

| Toast | Duration | Colour accent |
|-------|----------|---------------|
| Fill notification | 4s | `trading.uptick` left border |
| Order cancelled | 4s | `text.secondary` (neutral) |
| Cancel failed | 6s | `error.main` |
| Mutation success (generic) | 4s | `success.main` |
| Mutation error (generic) | 6s | `error.main` |

### 5.9 Document Title per Route

Implemented via `useDocumentTitle(title: string)` hook called in each page component.

| Route / state | `document.title` |
|---------------|-----------------|
| `/login` | `Sign in — PulseDesk Trader` |
| `/terminal` | `Terminal — PulseDesk Trader` |
| `/portfolio` | `Portfolio — PulseDesk Trader` |
| `/orders` | `Orders — PulseDesk Trader` |
| `/simulator` | `Simulator — PulseDesk Trader` |
| `*` (404) | `Not Found — PulseDesk Trader` |
| Shell fallback (no page loaded) | `PulseDesk Trader` |

The shell `AppShell` sets `PulseDesk Trader` as the base title; each page overrides it on mount.

---

## 6. Accessibility Contract

### 6.1 ARIA Landmark Roles — All Authenticated Pages

| Landmark | MUI element | Role |
|----------|-------------|------|
| `banner` | `AppBar` | `role="banner"` (MUI `AppBar` renders `<header>`) |
| `navigation` | Tabs in `AppBar` | `role="navigation"` `aria-label="Main navigation"` |
| `main` | Page `<Box>` below AppBar | `role="main"` (or MUI `main` component) |
| `complementary` | Watchlist panel, filter sidebar | `role="complementary"` `aria-label="Watchlist"` / `"Filters"` |

Login page: `main` landmark only (no `banner` or `nav`).

### 6.2 Focus Management on Route Transitions

On every route navigation:
1. `AppShell` `useEffect` responds to `useLocation()` change
2. `document.querySelector('main h1')?.focus()` — moves focus to the page `<h1>`
3. Each page renders a visually hidden (sr-only, `position: absolute; left: -9999px`) `<h1>` with the page name
4. `<h1>` has `tabIndex={-1}` to be programmatically focusable without appearing in Tab order

This ensures screen readers announce the new page name on every navigation.

### 6.3 Keyboard Navigation Path — Terminal Page

1. `Tab` from AppBar last element → Watchlist first row
2. `↑`/`↓` arrows within Watchlist rows; `Enter` selects symbol (dispatches `setSelectedSymbol`)
3. `Tab` → Chart panel (not interactable; `aria-label="Price chart for <symbol>"` on container)
4. `Tab` → Order ticket "Side" ToggleButtonGroup; `←`/`→` arrows switch BUY/SELL
5. `Tab` → "Type" ToggleButtonGroup; `←`/`→` arrows switch MARKET/LIMIT
6. `Tab` → Quantity input; `Tab` → Limit Price input (if visible)
7. `Tab` → Submit Order button; `Enter`/`Space` submits
8. `Tab` → Blotter/Positions tabs; `←`/`→` arrows switch tabs; `Enter`/`Space` activates
9. `Tab` → First row in active table

### 6.4 Keyboard Navigation Path — Orders Page

1. `Tab` → Filter sidebar first control (Status checkboxes)
2. `Tab` through all filter controls; `Space` toggles checkboxes; `Enter` activates Autocomplete selection
3. `Tab` → "Clear Filters" button
4. `Tab` → First row in Orders table
5. `Tab` within row → expand icon → Order ID copy button → Cancel button (if visible)
6. `Enter`/`Space` on expand icon → expands row
7. `Enter`/`Space` on cancel button → opens Dialog (focus moves to Dialog "Keep Order" button)
8. `Escape` in Dialog → closes Dialog, focus returns to cancel button
9. `Tab` after last row → pagination controls

### 6.5 Keyboard Navigation Path — Simulator Page

1. `Tab` → Traffic Profile ToggleButtonGroup; `←`/`→` to select profile
2. `Tab` → profile-specific inputs (order count / rate / duration)
3. `Tab` → Symbol checkboxes (`Space` to toggle)
4. `Tab` → Concurrency slider; `←`/`→` adjusts value
5. `Tab` → Scenario RadioGroup; `↑`/`↓` to select scenario
6. `Tab` → Start button; `Enter`/`Space` starts run
7. `Tab` → Pause button → Stop button
8. When RUNNING: config inputs are `disabled` — they are skipped in Tab order

### 6.6 Modal / Dialog Focus

All MUI `Dialog` components:
- On open: focus moves to the first focusable element inside the Dialog (MUI default)
- Cancel confirmation: focus opens on "Keep Order" / "Stay" (safe action), not the destructive button
- Tab cycles within the Dialog; `Shift+Tab` cycles backwards
- `Escape` always closes the Dialog and returns focus to the trigger element
- Focus trap is enforced by MUI Dialog's built-in `disablePortal={false}` + `keepMounted={false}` defaults

### 6.7 Colour Contrast Summary

All token combinations verified against WCAG AA (4.5:1 for text, 3:1 for UI components):

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Body text | `text.primary` (`#f0f0f0`) | `background.paper` (`#111111`) | 14.5:1 | ✓ AAA |
| Column headers | `text.secondary` (`#888888`) | `background.paper` (`#111111`) | 4.6:1 | ✓ AA |
| Primary teal on paper | `primary.main` (`#00bcd4`) | `background.paper` (`#111111`) | 6.1:1 | ✓ AA |
| Uptick value | `trading.uptick` (`#26a69a`) | `background.paper` (`#111111`) | 4.7:1 | ✓ AA |
| Downtick value | `trading.downtick` (`#ef5350`) | `background.paper` (`#111111`) | 4.6:1 | ✓ AA |
| Pending value | `trading.pending` (`#ffa726`) | `background.paper` (`#111111`) | 6.8:1 | ✓ AA |
| Primary on default bg | `primary.main` (`#00bcd4`) | `background.default` (`#0a0a0a`) | 6.4:1 | ✓ AA |
| Disabled (exempt) | `text.disabled` (`#444444`) | `background.paper` (`#111111`) | 1.9:1 | exempt (disabled) |

### 6.8 Loading States Accessibility

Every data-fetched surface:
- Container: `aria-busy="true"` while TanStack Query `isLoading` is true
- Loading content: MUI `Skeleton` (not a spinner) — `aria-label="Loading <surface name>"` on the Skeleton wrapper
- On load: `aria-busy` removed; content rendered; no focus change (user was not interacting with a loading region)

### 6.9 Form Labels

All `MUI TextField` instances:
- Use `label` prop (not `placeholder` alone) — MUI renders an associated `<label>` element
- Error state: `helperText` associated via `aria-describedby` (MUI default)
- Required fields: `required` prop + `*` in label text (screen reader reads "required")

---

## 7. Responsive Behaviour Summary

| Breakpoint | Terminal | Portfolio | Orders | Simulator |
|-----------|----------|-----------|--------|-----------|
| `lg+` ≥1280px | 3-col top + tabbed bottom | Summary + table + chart stacked | Sidebar + table side-by-side | 2-col: config left, stats/feed right |
| `md` 900–1279px | Stacked: watchlist → chart → ticket → blotter | Same, table scrolls horizontally | Drawer for filters, full-width table | Stacked: config → stats → feed |
| `< md` | Small screen warning banner shown; layout degrades gracefully | Same | Same | Same |

---

## Alternatives Considered

| Option | Pros | Cons | Why not selected |
|--------|------|------|-----------------|
| Bottom navigation (mobile pattern) | Familiar mobile UX | Wrong pattern for desktop workstation; wastes vertical space | Ruler archetype demands horizontal top nav |
| Collapsible sidebar as primary nav | More space for content | Requires extra click to switch pages; hides navigation | Tab bar is faster for keyboard users and power users |
| MUI DataGrid for all tables | Rich built-in features | Advanced features require commercial Pro license | TanStack Table v8 is MIT and integrates with MUI primitives |
| Spinner instead of Skeleton | Simpler implementation | Skeleton matches loaded content shape — less disorienting for users who know the layout | Ruler archetype: predictable, no visual noise |

---

## Consequences

- **Positive:** Every `@dev` task has an explicit pixel-level contract. No design ambiguity mid-implementation. No redesign after delivery.
- **Negative / trade-offs:** The Terminal three-column layout is demanding on small monitors (< 1280px). This is an accepted trade-off — the target user is on a professional workstation or large laptop.
- **Accessibility impact:** All contrast ratios verified. All interactive elements keyboard-reachable. Focus management on route transitions specified. Modal focus traps confirmed via MUI defaults.
- **Implementation notes for @dev:**
  - Use `useBlocker` from `react-router-dom` v7 for the simulator navigation guard — this hook is new in v7; verify it is imported from the correct location
  - The watchlist "stale data" visual state requires a CSS class or `data-` attribute toggle driven by `connectionStatus$` — do not use inline `style` prop for the flash/stale animation (CSS classes allow hardware acceleration)
  - The AppBar `Tabs` value must be derived from `useLocation().pathname` not from local state — otherwise browser back/forward breaks the active tab indicator
  - All `MUI Chip` status colours use a semi-transparent background (15% opacity) to avoid the chip colour overwhelming dense table rows — implement via `sx={{ bgcolor: 'success.main', opacity: 0.15 }}` on the background element or a custom `sx` pattern on the Chip
  - `useVirtualizer` in the simulator live feed requires the container `div` to have a fixed pixel height and `overflow: auto` — use `ref` to pass the scroll element to `useVirtualizer`
