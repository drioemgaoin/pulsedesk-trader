/**
 * @pulsedesk/ui — Semantic token constants
 * ════════════════════════════════════════════════════════════════════════
 *
 * Typed TypeScript references to every CSS custom property defined in
 * tokens.css. Import `pd` in components instead of writing raw
 * 'var(--pd-*)' strings — this gives you:
 *
 *   • Type safety  — TypeScript errors on typos
 *   • Discoverability — `pd.` autocomplete lists every token
 *   • Rename safety — change `--pd-bg-canvas` → update only here, all
 *                     usages update automatically via the constant
 *   • 1-second search — `pd.tableZebra` → find all table zebra usages
 *
 * HOW TO USE
 * ──────────
 *   import { pd } from '@pulsedesk/ui';
 *   <Box sx={{ bgcolor: pd.bgCanvas }} />           // instead of 'var(--pd-bg-canvas)'
 *   <Box sx={{ bgcolor: pd.tableZebra }} />          // instead of TABLE_ZEBRA_BG string
 *
 * DO NOT use these for values that MUI palette already covers:
 *   color: 'text.primary'       ✓  (MUI semantic)
 *   color: 'trading.uptick'     ✓  (extended palette)
 *   color: 'success.main'       ✓  (MUI semantic)
 *   color: pd.statusUp          ✗  (use 'success.main' instead)
 *
 * pd.* is for cases where MUI palette does not provide a direct key,
 * e.g. canvas background, table rows, appbar border, status-cancelled.
 */

/* ── Backgrounds ──────────────────────────────────────────────────────── */

/** Page / workspace canvas — deepest background layer. */
export const PD_BG_CANVAS   = 'var(--pd-bg-canvas)'   as const;
/** Card / panel surface — one step above canvas. */
export const PD_BG_SURFACE  = 'var(--pd-bg-surface)'  as const;
/** Elevated panel, tooltip, popover — one step above surface. */
export const PD_BG_RAISED   = 'var(--pd-bg-raised)'   as const;
/** Dialog / modal overlay background. */
export const PD_BG_OVERLAY  = 'var(--pd-bg-overlay)'  as const;

/* ── Borders ──────────────────────────────────────────────────────────── */

/** Hairline dividers — least prominent. */
export const PD_BORDER_SUBTLE  = 'var(--pd-border-subtle)'  as const;
/** Standard borders — inputs, cards, table cells. */
export const PD_BORDER_DEFAULT = 'var(--pd-border-default)' as const;
/** Strong borders — hover / focus state upgrade. */
export const PD_BORDER_STRONG  = 'var(--pd-border-strong)'  as const;

/* ── Accent ───────────────────────────────────────────────────────────── */

/** Brand primary accent — amber in dark, deeper amber in light. */
export const PD_ACCENT_PRIMARY       = 'var(--pd-accent-primary)'            as const;
/** Hover shade of the primary accent. */
export const PD_ACCENT_PRIMARY_HOVER = 'var(--pd-accent-primary-hover)'      as const;
/** Low-opacity tint of the primary accent — muted fill. */
export const PD_ACCENT_PRIMARY_MUTED = 'var(--pd-accent-primary-muted)'      as const;
/** Stronger tint — hover state of muted fill. */
export const PD_ACCENT_PRIMARY_MUTED_STRONG = 'var(--pd-accent-primary-muted-strong)' as const;

/* ── Status ───────────────────────────────────────────────────────────── */

/** Cancelled order — neutral slate grey. */
export const PD_STATUS_CANCELLED = 'var(--pd-status-cancelled)' as const;
/** Partially-filled order — cyan (between accepted-blue and filled-green). */
export const PD_STATUS_PARTIAL   = 'var(--pd-status-partial)'   as const;

/* ── Interactive states ───────────────────────────────────────────────── */

/** Row / item hover background overlay. */
export const PD_HOVER    = 'var(--pd-hover)'    as const;
/** Selected item background. */
export const PD_SELECTED = 'var(--pd-selected)' as const;

/* ── Table rows ───────────────────────────────────────────────────────── */

/**
 * Alternating (zebra) row background.
 * Apply to odd-indexed rows: sx={{ bgcolor: pd.tableZebra }}.
 * Theme-aware — adapts automatically to dark / light mode.
 */
export const PD_TABLE_ZEBRA = 'var(--pd-table-zebra)' as const;

/**
 * Table row hover background.
 * Theme-aware — adapts automatically to dark / light mode.
 */
export const PD_TABLE_HOVER = 'var(--pd-table-hover)' as const;

/* ── Appbar ───────────────────────────────────────────────────────────── */

/** Accent-tinted bottom border of the app bar. */
export const PD_APPBAR_BORDER = 'var(--pd-appbar-border)' as const;

/* ── Convenience object ───────────────────────────────────────────────── */

/**
 * All semantic CSS-variable tokens as a single typed object.
 *
 * @example
 *   import { pd } from '@pulsedesk/ui';
 *   <Box sx={{ bgcolor: pd.bgCanvas, borderColor: pd.borderDefault }} />
 */
export const pd = {
  bgCanvas:  PD_BG_CANVAS,
  bgSurface: PD_BG_SURFACE,
  bgRaised:  PD_BG_RAISED,
  bgOverlay: PD_BG_OVERLAY,

  borderSubtle:  PD_BORDER_SUBTLE,
  borderDefault: PD_BORDER_DEFAULT,
  borderStrong:  PD_BORDER_STRONG,

  accentPrimary:           PD_ACCENT_PRIMARY,
  accentPrimaryHover:      PD_ACCENT_PRIMARY_HOVER,
  accentPrimaryMuted:      PD_ACCENT_PRIMARY_MUTED,
  accentPrimaryMutedStrong: PD_ACCENT_PRIMARY_MUTED_STRONG,

  statusCancelled: PD_STATUS_CANCELLED,
  statusPartial:   PD_STATUS_PARTIAL,

  hover:    PD_HOVER,
  selected: PD_SELECTED,

  tableZebra: PD_TABLE_ZEBRA,
  tableHover: PD_TABLE_HOVER,

  appbarBorder: PD_APPBAR_BORDER,
} as const;

export type PdToken = typeof pd[keyof typeof pd];
