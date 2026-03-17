import { pd } from './semantics';

/**
 * @pulsedesk/ui — Shared style constants
 * ════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for any style that must be consistent across
 * multiple MFEs. Change here, the whole app stays in sync.
 *
 * Contents
 * ────────
 *  1. Order status — chip colour mapping + display sx
 *  2. Interactive chip sx — hover / active states for filter chips
 *  3. Trade side toggle — BUY / SELL button state matrix
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. ORDER STATUS
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'FILLED'
  | 'PARTIALLY_FILLED'
  | 'REJECTED'
  | 'CANCELLED';

export type MuiChipColor = 'default' | 'warning' | 'info' | 'success' | 'error' | 'primary';

/**
 * Maps every order status to its MUI Chip colour.
 * Used wherever an order status badge is rendered (BlotterPanel, OrdersPage, …).
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, MuiChipColor> = {
  PENDING:          'warning',
  ACCEPTED:         'info',
  FILLED:           'success',
  PARTIALLY_FILLED: 'default',  // colour applied via partiallyFilledChipSx
  REJECTED:         'error',
  CANCELLED:        'default',  // colour applied via cancelledChipSx
};

/**
 * Display-only chip sx — size, weight, tracking.
 * Apply to every status Chip that shows an order status.
 */
export const statusChipSx = {
  fontSize:      '0.625rem',
  height:        18,
  fontWeight:    700,
  letterSpacing: '0.03em',
} as const;

/**
 * Extra sx for PARTIALLY_FILLED status chips.
 * Cyan / teal — sits visually between ACCEPTED (blue) and FILLED (green),
 * communicating "in progress towards a fill".
 * Scoped to &.MuiChip-filled so outlined (inactive) filter chips are unaffected.
 * Compose on top of statusChipSx:  sx={{ ...statusChipSx, ...partiallyFilledChipSx }}
 */
export const partiallyFilledChipSx = {
  '&.MuiChip-filled': {
    backgroundColor: pd.statusPartial,
    color: '#ffffff',
  },
};

/**
 * Extra sx for CANCELLED status chips.
 * Strikethrough = universal "voided" convention. Slate grey = clearly inactive,
 * distinct from near-black 'default' which disappears on dark backgrounds.
 * Scoped to &.MuiChip-filled so outlined (inactive) filter chips are unaffected.
 * Compose on top of statusChipSx:  sx={{ ...statusChipSx, ...cancelledChipSx }}
 */
export const cancelledChipSx = {
  '&.MuiChip-filled': {
    backgroundColor: pd.statusCancelled,
    color: 'rgba(255,255,255,0.85)',
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// 2. INTERACTIVE CHIP SX  (filter chips that can be toggled on/off)
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThemeCallback<T> = (theme: any) => T;

/**
 * Returns MUI sx for a clickable filter chip.
 *
 * @param isActive  true  → chip is filled/selected (brightness states)
 *                  false → chip is outlined/unselected (overlay states)
 *
 * State matrix — two distinct visual vocabularies, impossible to confuse:
 *   Hover   → outline ring appears outside chip (no fill change)
 *   Active  → ring disappears, chip darkens + compresses (pressed)
 *   H + A   → both: darkened + ring visible simultaneously
 *
 * ┌──────────────┬──────────────────────────────────────────────────────────────────┐
 * │ Filled hover │ 2px white ring outside chip — chip colour unchanged              │
 * │ Filled active│ brightness 0.72 + scale 0.95 — clearly darker + pressed          │
 * │ Filled h+a   │ brightness 0.72 + scale 0.95 + 2px ring — both at once           │
 * ├──────────────┼──────────────────────────────────────────────────────────────────┤
 * │ Outline hover│ 2px currentColor ring — matches chip status colour               │
 * │ Outline actv │ solid bg tint + scale 0.95 — clearly pressed                    │
 * │ Outline h+a  │ solid bg tint + scale 0.95 + 2px ring — both at once            │
 * └──────────────┴──────────────────────────────────────────────────────────────────┘
 */
export function filterChipSx(isActive: boolean) {
  if (isActive) {
    return {
      '&:hover':        { outline: '2px solid rgba(255,255,255,0.55)', outlineOffset: '2px' },
      '&:active':       { filter: 'brightness(0.72)', transform: 'scale(0.95)', outline: 'none' },
      '&:hover:active': { filter: 'brightness(0.72)', transform: 'scale(0.95)', outline: '2px solid rgba(255,255,255,0.55)', outlineOffset: '2px' },
    };
  }

  const bg = (dark: string, light: string): ThemeCallback<string> =>
    (t) => t.palette.mode === 'dark' ? dark : light;

  // Fixed rgba ring — works on all chip colours including grey/default (currentColor fails there)
  const ring = bg('2px solid rgba(255,255,255,0.55)', '2px solid rgba(0,0,0,0.35)');

  return {
    '&:hover':        { outline: ring, outlineOffset: '2px' },
    '&:active':       { backgroundColor: bg('rgba(255,255,255,0.18)', 'rgba(0,0,0,0.12)'), transform: 'scale(0.95)', outline: 'none' },
    '&:hover:active': { backgroundColor: bg('rgba(255,255,255,0.18)', 'rgba(0,0,0,0.12)'), transform: 'scale(0.95)', outline: ring, outlineOffset: '2px' },
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. TRADE SIDE TOGGLE  (was section 3, now kept for reference)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 4. DESIGN SYSTEM SCALE — single source of truth for component sizes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Three-tier size scale shared across ALL interactive components.
 * Import in theme.ts — never hardcode sizes in components directly.
 *
 * Heights are identical across Button / ToggleButton / IconButton / TextField
 * so same-size elements sit flush on the same baseline in toolbars/form rows.
 * Chip heights are intentionally smaller (data label, not action target) but
 * scale proportionally.
 *
 *   sm = compact  (toolbars, dense tables, secondary actions)  — 28 px
 *   md = default  (most UI: forms, primary actions)            — 36 px
 *   lg = prominent (hero CTAs, modal footers)                  — 44 px
 */
export const SIZES = {
  sm: {
    height:           28,
    fontSize:         '0.75rem',     // 12 px
    padding:          '3px 12px',
    togglePadding:    '3px 8px',
    iconDimension:    28,
    chipHeight:       20,
    chipFontSize:     '0.6875rem',   // 11 px
    chipLabelPadding: '0 8px',
    chipBorderRadius: 4,
  },
  md: {
    height:           36,
    fontSize:         '0.8125rem',   // 13 px
    padding:          '6px 16px',
    togglePadding:    '5px 12px',
    iconDimension:    36,
    chipHeight:       24,
    chipFontSize:     '0.75rem',     // 12 px
    chipLabelPadding: '0 10px',
    chipBorderRadius: 5,
  },
  lg: {
    height:           44,
    fontSize:         '0.9375rem',   // 15 px
    padding:          '10px 24px',
    togglePadding:    '9px 20px',
    iconDimension:    44,
    chipHeight:       32,
    chipFontSize:     '0.8125rem',   // 13 px
    chipLabelPadding: '0 14px',
    chipBorderRadius: 6,
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 5. TABLE ROW STYLES — zebra striping + hover
// ─────────────────────────────────────────────────────────────────────────────

/** Alternating background applied to odd-indexed data rows (index % 2 === 1). */
export const TABLE_ZEBRA_BG = pd.tableZebra;

/** Background applied on row hover. */
export const TABLE_HOVER_BG = pd.tableHover;

/**
 * Base MUI sx for a data table row.
 * Provides zebra striping (alternating rows) and a uniform hover state.
 *
 * Usage:
 *   <TableRow sx={tableRowSx(index)} />
 *   <TableRow sx={{ ...tableRowSx(index), ...myStatusOverrides }} />
 */
export const tableRowSx = (index: number) => ({
  bgcolor: index % 2 === 1 ? TABLE_ZEBRA_BG : 'transparent',
  '&:hover': { bgcolor: TABLE_HOVER_BG },
});

/**
 * Table-level sx to apply zebra striping via CSS nth-of-type.
 * Use when per-row index is unavailable (e.g. WatchlistPanel).
 * Excludes selected rows (.Mui-selected) so their highlight is preserved.
 *
 * Usage:
 *   <Table sx={{ ...myTableSx, ...tableZebraTableSx }} />
 */
export const tableZebraTableSx = {
  '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd):not(.Mui-selected)': {
    bgcolor: TABLE_ZEBRA_BG,
  },
} as const;


// ─────────────────────────────────────────────────────────────────────────────
// 6. TRADE SIDE TOGGLE  (BUY / SELL ToggleButton)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns MUI sx for a BUY or SELL ToggleButton.
 * Merge with any per-component typography overrides (fontSize, fontWeight…).
 *
 * State matrix — all states stay in the green / red family:
 * ┌────────────────────────┬──────────────────────────────────────────────────┐
 * │ Unselected default     │ transparent bg — coloured text + border          │
 * │ Unselected hover       │ solid main — white text  (preview)               │
 * │ Unselected active      │ dark shade — white text  (committing)            │
 * ├────────────────────────┼──────────────────────────────────────────────────┤
 * │ Selected default       │ solid main — white text  (committed)             │
 * │ Selected hover         │ light shade — white text (elevated)              │
 * │ Selected active        │ dark shade  — white text (pressed)               │
 * │ Selected hover + active│ dark shade  — white text (pressed while hovering)│
 * └────────────────────────┴──────────────────────────────────────────────────┘
 */
export function tradeSideToggleSx(side: 'BUY' | 'SELL') {
  const c = side === 'BUY' ? 'success' : 'error';
  return {
    color:       `${c}.main`,
    borderColor: `${c}.main`,
    '&:hover:not(.Mui-selected)':       { bgcolor: `${c}.main`,  color: `${c}.contrastText` },
    '&:active:not(.Mui-selected)':      { bgcolor: `${c}.dark`,  color: `${c}.contrastText` },
    '&:hover:active:not(.Mui-selected)':{ bgcolor: `${c}.dark`,  color: `${c}.contrastText` },
    '&.Mui-selected': {
      bgcolor:     `${c}.main`,
      color:       `${c}.contrastText`,
      borderColor: `${c}.main`,
      '&:hover':        { bgcolor: `${c}.light`, color: `${c}.contrastText` },
      '&:active':       { bgcolor: `${c}.dark`,  color: `${c}.contrastText` },
      '&:hover:active': { bgcolor: `${c}.dark`,  color: `${c}.contrastText` },
    },
    '&.Mui-focusVisible': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      boxShadow: (t: any) => `0 0 0 2px ${t.palette.background.paper}, 0 0 0 4px ${t.palette[c].main}`,
      outline: 'none',
    },
  };
}
