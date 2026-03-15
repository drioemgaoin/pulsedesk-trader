/**
 * MUI Theme Factory
 * ═══════════════════════════════════════════════════════════════════
 *
 * This file wires MUI's theme system to the CSS custom property tokens
 * defined in tokens.css.
 *
 * HOW IT WORKS
 * ────────────
 * Every palette value below is a CSS variable string, e.g. 'var(--pd-status-up)'.
 * When MUI's sx prop resolves `color: 'trading.uptick'`, it looks up
 * `theme.palette.trading.uptick` → 'var(--pd-status-up)'.
 * The browser then resolves that var against the active [data-theme] block.
 *
 * Result in DevTools: you see `color: var(--pd-status-up)` on the element.
 * Search "pd-status-up" in tokens.css → found immediately → fix in one place.
 *
 * HOW TO ADD A NEW THEME
 * ──────────────────────
 * 1. Add a [data-theme="your-name"] block in tokens.css.
 * 2. Add "your-name" to THEME_MODES in themeSlice.ts.
 * No changes to this file or any component required.
 */

import { createTheme, type PaletteMode } from '@mui/material/styles';

/* ── MUI palette extension typings ─────────────────────────────────── */
declare module '@mui/material/styles' {
  interface Palette {
    trading: {
      uptick:  string;  /* maps to var(--pd-status-up)   */
      downtick: string; /* maps to var(--pd-status-down)  */
      pending: string;  /* maps to var(--pd-status-pending) */
      neutral: string;  /* maps to var(--pd-status-neutral) */
    };
  }
  interface PaletteOptions {
    trading?: {
      uptick?:  string;
      downtick?: string;
      pending?: string;
      neutral?: string;
    };
  }
  interface TypeBackground {
    elevated: string;   /* maps to var(--pd-bg-raised) */
  }
}
declare module '@mui/material/styles/createPalette' {
  interface TypeBackground {
    elevated: string;
  }
}

/* ─────────────────────────────────────────────────────────────────────
   RAW VALUES PER MODE
   MUI's createTheme() calls lighten()/darken()/alpha() on primary,
   secondary, error, warning, success, info — it cannot parse CSS var
   strings. Those six entries use raw hex; everything else (background,
   text, divider, action, trading) is safe to pass as a CSS var because
   MUI uses those values verbatim without any color computation.
   ───────────────────────────────────────────────────────────────────── */
/*
 * All standard MUI palette entries must be raw hex.
 * MUI's component style functions (Button, Switch, Slider, etc.) call
 * alpha() / lighten() / darken() on text.primary, background.paper,
 * action.hover, and the semantic entries (error, success, …).
 * None of those functions can parse CSS var strings.
 *
 * trading.* is the only safe CSS-var zone — it is fully custom and
 * MUI never runs color math on it. Components using
 * sx={{ color: 'trading.uptick' }} will render
 * `color: var(--pd-status-up)` in the DOM → instantly findable in DevTools.
 */
const RAW = {
  dark: {
    /* Surfaces */
    bgCanvas:    '#070B14',
    bgSurface:   '#0D1321',
    bgRaised:    '#162033',
    /* Borders / divider */
    divider:     '#1E2D45',
    /* Text */
    textPrimary:   '#E8EDF5',
    textSecondary: '#8A9BB5',
    textDisabled:  '#3A4F6A',
    textOnAccent:  '#070B14',
    /* Primary — amber (Bloomberg heritage, financial precision, live data) */
    accentPrimary:      '#F59E0B',  /* contrast ~7:1 on bgSurface */
    accentPrimaryDark:  '#D97706',
    accentPrimaryLight: '#FBBF24',
    /* Secondary — blue (Sage: expertise, depth) */
    accentSecondary:    '#4A90D9',
    accentSecondaryDk:  '#3578C4',
    accentSecondaryLt:  '#5FA0DE',
    accentOnSecondary:  '#070B14',
    /* Status — main/light/dark must be distinct so MUI hover math produces visible change */
    statusUp:        '#3DAA6A',
    statusUpLight:   '#52C27D',  /* hover */
    statusUpDark:    '#2A8F55',  /* active press */
    statusDown:      '#D95E52',
    statusDownLight: '#E87870',  /* hover */
    statusDownDark:  '#C04840',  /* active press */
    statusPending:   '#E0963A',
    statusPendingLight: '#F0B060',
    statusPendingDark:  '#C07020',
    statusNeutral: '#3A4F6A',
    /* Action overlays (raw alpha hex to avoid alpha() calls on CSS vars) */
    actionHover:    'rgba(255,255,255,0.04)',
    actionSelected: 'rgba(245,158,11,0.10)',
    actionDisabledBg: 'rgba(255,255,255,0.06)',
  },
  light: {
    /* Surfaces */
    bgCanvas:  '#F4F1EB',
    bgSurface: '#FAFAF7',
    bgRaised:  '#FFFFFF',
    /* Borders / divider */
    divider:   '#DDD8CC',
    /* Text */
    textPrimary:   '#0E1520',
    textSecondary: '#4A5A72',
    textDisabled:  '#9BA8BC',
    textOnAccent:  '#FFFFFF',
    /* Primary — amber (Pulse) — contrast ~4.9:1 on parchment-50 */
    accentPrimary:      '#B45309',
    accentPrimaryDark:  '#92400E',
    accentPrimaryLight: '#D97706',
    /* Secondary — blue */
    accentSecondary:    '#2B5EA7',
    accentSecondaryDk:  '#1E4A87',
    accentSecondaryLt:  '#3578C4',
    accentOnSecondary:  '#FFFFFF',
    /* Status — main/light/dark must be distinct */
    statusUp:        '#1A7A42',
    statusUpLight:   '#2A8F55',  /* hover */
    statusUpDark:    '#126030',  /* active press */
    statusDown:      '#A83530',
    statusDownLight: '#C04840',  /* hover */
    statusDownDark:  '#862A25',  /* active press */
    statusPending:   '#C07020',
    statusPendingLight: '#D98030',
    statusPendingDark:  '#9A5818',
    statusNeutral: '#4A6080',
    /* Action overlays */
    actionHover:    'rgba(0,0,0,0.04)',
    actionSelected: 'rgba(180,83,9,0.09)',
    actionDisabledBg: 'rgba(0,0,0,0.05)',
  },
} as const;

export function createAppTheme(mode: PaletteMode) {
  const c = RAW[mode];

  return createTheme({

    /* ── Palette ────────────────────────────────────────────────── */
    palette: {
      mode,
      background: {
        default:  c.bgCanvas,
        paper:    c.bgSurface,
        elevated: c.bgRaised,
      },
      divider: c.divider,
      text: {
        primary:   c.textPrimary,
        secondary: c.textSecondary,
        disabled:  c.textDisabled,
      },
      action: {
        hover:              c.actionHover,
        selected:           c.actionSelected,
        disabledBackground: c.actionDisabledBg,
      },
      primary: {
        main:         c.accentPrimary,
        dark:         c.accentPrimaryDark,
        light:        c.accentPrimaryLight,
        contrastText: c.textOnAccent,
      },
      secondary: {
        main:         c.accentSecondary,
        dark:         c.accentSecondaryDk,
        light:        c.accentSecondaryLt,
        contrastText: c.accentOnSecondary,
      },
      error:   { main: c.statusDown,    dark: c.statusDownDark,    light: c.statusDownLight,    contrastText: '#fff' },
      warning: { main: c.statusPending, dark: c.statusPendingDark, light: c.statusPendingLight, contrastText: '#fff' },
      success: { main: c.statusUp,      dark: c.statusUpDark,      light: c.statusUpLight,      contrastText: '#fff' },
      info:    { main: c.accentSecondary, dark: c.accentSecondaryDk, light: c.accentSecondaryLt, contrastText: '#fff' },
      /*
       * trading.* is entirely custom — MUI never calls alpha() on it.
       * sx={{ color: 'trading.uptick' }} renders `color: var(--pd-status-up)`
       * in the DOM, so DevTools shows the token name directly.
       */
      trading: {
        uptick:   'var(--pd-status-up)',
        downtick: 'var(--pd-status-down)',
        pending:  'var(--pd-status-pending)',
        neutral:  'var(--pd-status-neutral)',
      },
    },


    /* ── Typography ─────────────────────────────────────────────── */
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      fontSize: 13,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h4: { fontSize: '1.5rem',  fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.25 },
      h5: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em',  lineHeight: 1.3  },
      h6: { fontSize: '1.0rem',  fontWeight: 600, letterSpacing: '-0.01em',  lineHeight: 1.4  },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.4 },
      body1:  { fontSize: '0.8125rem', lineHeight: 1.5 },
      body2:  { fontSize: '0.75rem',   lineHeight: 1.5 },
      caption: {
        fontSize: '0.6875rem',   /* 11px */
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: '0.07em',
      },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.10em',
        textTransform: 'uppercase' as const,
        lineHeight: 1.4,
      },
      button: { textTransform: 'none' as const, fontWeight: 600, letterSpacing: '0.01em' },
    },


    /* ── Spacing & shape ────────────────────────────────────────── */
    spacing: 4,   /* 1 unit = 4px  →  spacing(2) = 8px */
    shape:  { borderRadius: 6 },


    /* ── Component overrides: flat, professional design ─────────── */
    components: {

      /* ── Layout: AppBar ── */
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: 'var(--pd-bg-surface)',
            borderBottom: '1px solid var(--pd-appbar-border)',
            boxShadow: 'none',
          },
        },
      },

      /* ── Layout: Paper / Card ── */
      MuiPaper: {
        defaultProps: { elevation: 0, variant: 'outlined' },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: 'var(--pd-bg-surface)',
            borderColor: 'var(--pd-border-subtle)',
          },
          /* elevation variant (e.g. Snackbar fills) keeps a subtle shadow */
          elevation1: {
            boxShadow: mode === 'dark'
              ? '0 2px 8px rgba(0,0,0,0.40)'
              : '0 2px 8px rgba(0,0,0,0.12)',
            border: 'none',
          },
          elevation4: {
            boxShadow: mode === 'dark'
              ? '0 4px 20px rgba(0,0,0,0.50)'
              : '0 4px 20px rgba(0,0,0,0.16)',
            border: 'none',
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0, variant: 'outlined' },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: 'var(--pd-bg-surface)',
            borderColor: 'var(--pd-border-subtle)',
          },
        },
      },

      /* ── Navigation: Tabs ── */
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 40 },
          indicator: {
            backgroundColor: 'var(--pd-accent-primary)',
            height: 2,
            borderRadius: '2px 2px 0 0',
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            fontSize: '0.8125rem',
            fontWeight: 500,
            textTransform: 'none',
            letterSpacing: '0',
            color: 'var(--pd-text-secondary)',
            padding: '0 16px',
            transition: 'color 120ms ease, background 120ms ease, box-shadow 120ms ease',
            '&.Mui-selected': {
              color: 'var(--pd-text-primary)',
              fontWeight: 600,
            },
            '&:hover': {
              color: 'var(--pd-text-primary)',
              background: 'var(--pd-hover)',
            },
            '&:active': {
              background: c.actionSelected,
            },
            '&.Mui-focusVisible': {
              boxShadow: `inset 0 0 0 2px ${c.accentPrimary}`,
              outline: 'none',
            },
          },
        },
      },

      /* ── Tables ── */
      MuiTable: {
        defaultProps: { size: 'small' },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '6px 10px',
            borderBottomColor: 'var(--pd-border-subtle)',
            fontSize: '0.8125rem',
          },
          head: {
            color: 'var(--pd-text-secondary)',
            fontWeight: 600,
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            borderBottomColor: 'var(--pd-border-default)',
            whiteSpace: 'nowrap',
          },
          footer: {
            borderTopColor: 'var(--pd-border-default)',
            borderBottom: 'none',
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': {
              backgroundColor: 'var(--pd-hover)',
            },
            '&.Mui-selected': {
              backgroundColor: 'var(--pd-selected)',
              '&:hover': {
                backgroundColor: 'var(--pd-selected)',
              },
            },
            /* Keyboard focus ring for navigable rows (tabIndex=0) */
            '&:focus-visible': {
              outline: `2px solid ${c.accentPrimary}`,
              outlineOffset: '-2px',
              zIndex: 1,
              position: 'relative',
            },
          },
        },
      },

      /* ── Tables: Sort label ── */
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            transition: 'color 120ms ease',
            '&:hover': {
              color: 'var(--pd-text-primary)',
            },
            '&.Mui-active': {
              color: 'var(--pd-text-primary)',
              '& .MuiTableSortLabel-icon': {
                opacity: 1,
                color: 'var(--pd-accent-primary)',
              },
            },
            '&.Mui-focusVisible': {
              outline: `1px solid ${c.accentPrimary}`,
              outlineOffset: 2,
              borderRadius: 2,
            },
          },
        },
      },

      /* ── Forms: Inputs ── */
      MuiTextField: {
        defaultProps: { size: 'small', variant: 'outlined' },
      },

      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: {
            borderColor: 'var(--pd-border-default)',
            transition: 'border-color 120ms ease',
          },
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--pd-border-strong)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--pd-accent-primary)',
              borderWidth: 1,
            },
            '&.Mui-disabled': {
              opacity: 0.5,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--pd-border-subtle)',
              },
            },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--pd-status-down)',
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            color: 'var(--pd-text-secondary)',
            '&.Mui-focused': { color: 'var(--pd-accent-primary)' },
          },
        },
      },

      /* ── Forms: Buttons ── */
      MuiButton: {
        defaultProps: { disableElevation: true, disableRipple: false },
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
            letterSpacing: '0.01em',
            transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 80ms ease',
            /* Tactile press feedback — subtle scale for all Button variants */
            '@media (prefers-reduced-motion: no-preference)': {
              '&:active:not(.Mui-disabled)': {
                transform: 'scale(0.975)',
              },
            },
            /* Keyboard focus ring — double ring, always visible on focus-via-keyboard */
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: 'none',
            },
            /* Focus ring persists and brightens when also hovered */
            '&.Mui-focusVisible:hover': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimaryLight}`,
            },
          },
          sizeMedium: { padding: '7px 16px', fontSize: '0.8125rem' },
          sizeSmall:  { padding: '4px 12px', fontSize: '0.75rem' },
          /* Primary (gold) — flat solid, no gradient */
          containedPrimary: {
            backgroundColor: c.accentPrimary,
            color: c.textOnAccent,
            '&:hover': {
              backgroundColor: c.accentPrimaryLight,
            },
            '&:active, &:hover:active': {
              backgroundColor: c.accentPrimaryDark,
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--pd-disabled)',
              color: 'var(--pd-text-muted)',
            },
          },
          outlinedPrimary: {
            borderColor: c.accentPrimary,
            color: c.accentPrimary,
            '&:hover': {
              backgroundColor: 'var(--pd-accent-primary-muted)',
              borderColor: c.accentPrimary,
            },
            '&:active, &:hover:active': {
              backgroundColor: 'var(--pd-accent-primary-muted)',
              borderColor: c.accentPrimaryDark,
              color: c.accentPrimaryDark,
            },
            '&.Mui-disabled': {
              borderColor: 'var(--pd-disabled)',
              color: 'var(--pd-text-muted)',
            },
          },
          text: {
            '&:active, &:hover:active': {
              backgroundColor: c.actionSelected,
            },
          },

          /* ── Success (BUY / positive action) ── */
          containedSuccess: {
            backgroundColor: c.statusUp,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: c.statusUpLight,
            },
            '&:active, &:hover:active': {
              backgroundColor: c.statusUpDark,
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--pd-disabled)',
              color: 'var(--pd-text-muted)',
            },
            /* Semantic focus ring: green matches the button's meaning */
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.statusUp}`,
              outline: 'none',
            },
            '&.Mui-focusVisible:hover': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.statusUpLight}`,
            },
          },

          /* ── Error (SELL / destructive action) ── */
          containedError: {
            backgroundColor: c.statusDown,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: c.statusDownLight,
            },
            '&:active, &:hover:active': {
              backgroundColor: c.statusDownDark,
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--pd-disabled)',
              color: 'var(--pd-text-muted)',
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.statusDown}`,
              outline: 'none',
            },
            '&.Mui-focusVisible:hover': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.statusDownLight}`,
            },
          },

          /* ── Warning (cautionary action) ── */
          containedWarning: {
            backgroundColor: c.statusPending,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: c.statusPendingLight,
            },
            '&:active, &:hover:active': {
              backgroundColor: c.statusPendingDark,
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.statusPending}`,
              outline: 'none',
            },
          },
        },
      },

      /* ── Forms: IconButton ── */
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            transition: 'background 120ms ease, color 120ms ease, box-shadow 120ms ease, transform 80ms ease',
            '&:hover': {
              backgroundColor: c.actionHover,
            },
            '&:active': {
              backgroundColor: c.actionSelected,
            },
            /* hover+active together → clear pressed state regardless of hover */
            '&:hover:active': {
              backgroundColor: c.actionSelected,
            },
            '@media (prefers-reduced-motion: no-preference)': {
              '&:active:not(.Mui-disabled)': {
                transform: 'scale(0.84)',
              },
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: 'none',
            },
            '&.Mui-focusVisible:hover': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimaryLight}`,
            },
            '&.Mui-disabled': {
              opacity: 0.38,
            },
          },
        },
      },

      /* ── Forms: ToggleButtonGroup ── */
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            gap: 2,
            '& .MuiToggleButtonGroup-grouped': {
              borderRadius: '6px !important',
              border: '1px solid var(--pd-border-default) !important',
              margin: 0,
            },
          },
        },
      },

      MuiToggleButton: {
        styleOverrides: {
          root: {
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.03em',
            textTransform: 'none',
            padding: '5px 12px',
            color: 'var(--pd-text-secondary)',
            borderColor: 'var(--pd-border-default)',
            transition: 'color 100ms, background 100ms, border-color 100ms, box-shadow 120ms ease',
            '&:hover': {
              backgroundColor: 'var(--pd-hover)',
              color: 'var(--pd-text-primary)',
            },
            '&:active': {
              backgroundColor: c.actionSelected,
            },
            /* hover+active → same pressed feel regardless of how you got there */
            '&:hover:active': {
              backgroundColor: c.actionSelected,
              filter: 'brightness(0.92)',
            },
            /* Default selected: teal accent */
            '&.Mui-selected': {
              color: 'var(--pd-accent-primary)',
              backgroundColor: 'var(--pd-accent-primary-muted)',
              borderColor: 'var(--pd-accent-primary) !important',
              '&:hover': {
                /* Noticeably stronger fill — clearly different from unselected */
                backgroundColor: 'var(--pd-accent-primary-muted-strong)',
                filter: 'none',
              },
              /* selected+active or selected+hover+active → visible press */
              '&:active': {
                backgroundColor: 'var(--pd-accent-primary-muted-strong)',
                filter: 'brightness(0.88)',
              },
              '&:hover:active': {
                backgroundColor: 'var(--pd-accent-primary-muted-strong)',
                filter: 'brightness(0.82)',
              },
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: 'none',
            },
            '&.Mui-focusVisible:hover': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimaryLight}`,
            },
            '&.Mui-disabled': {
              opacity: 0.4,
            },
          },
        },
      },

      /* ── Data: Chip / Badge ── */
      MuiChip: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 600,
            fontSize: '0.6875rem',
            letterSpacing: '0.04em',
            height: 20,
            transition: 'opacity 120ms ease, box-shadow 120ms ease, transform 120ms ease',
            /* Clickable chips (onClick provided) get interactive states */
            '&.MuiChip-clickable': {
              '&:hover': {
                opacity: 0.82,
              },
              /* hover+active → same visual press */
              '&:active, &:hover:active': {
                opacity: 0.65,
                '@media (prefers-reduced-motion: no-preference)': {
                  transform: 'scale(0.95)',
                },
              },
              '&.Mui-focusVisible': {
                boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
                outline: 'none',
                opacity: 1,
              },
              '&.Mui-focusVisible:hover': {
                opacity: 0.82,
                boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimaryLight}`,
              },
            },
          },
          /* Outlined variant — used for status chips in blotter */
          outlined: {
            borderWidth: 1,
          },
          /* Success = FILLED */
          colorSuccess: {
            color: c.statusUp,
            borderColor: 'var(--pd-status-up-muted)',
            backgroundColor: 'var(--pd-status-up-muted)',
          },
          /* Error = REJECTED */
          colorError: {
            color: c.statusDown,
            borderColor: 'var(--pd-status-down-muted)',
            backgroundColor: 'var(--pd-status-down-muted)',
          },
          /* Warning = PENDING */
          colorWarning: {
            color: c.statusPending,
            backgroundColor: 'transparent',
          },
        },
      },

      /* ── Accordion ── */
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            transition: 'background 120ms ease',
            '&:hover': {
              backgroundColor: c.actionHover,
            },
            '&:active': {
              backgroundColor: c.actionSelected,
            },
            '&.Mui-focusVisible': {
              backgroundColor: 'transparent',
              boxShadow: `inset 0 0 0 2px ${c.accentPrimary}`,
              outline: 'none',
            },
          },
        },
      },

      /* ── Forms: Checkbox ── */
      MuiCheckbox: {
        styleOverrides: {
          root: {
            transition: 'color 120ms ease, box-shadow 120ms ease',
            borderRadius: 4,
            /* Hover: hint the checked color even when unchecked */
            '&:hover': {
              backgroundColor: c.actionHover,
            },
            /* hover+active → clear press, same as active */
            '&:hover:active': {
              backgroundColor: c.actionSelected,
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: 'none',
              borderRadius: 4,
            },
            '&.Mui-disabled': {
              opacity: 0.38,
            },
          },
        },
      },

      /* ── Forms: Radio ── */
      MuiRadio: {
        styleOverrides: {
          root: {
            transition: 'color 120ms ease, box-shadow 120ms ease',
            '&:hover': {
              backgroundColor: c.actionHover,
            },
            '&:hover:active': {
              backgroundColor: c.actionSelected,
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: 'none',
            },
            '&.Mui-disabled': {
              opacity: 0.38,
            },
          },
        },
      },

      /* ── Forms: Slider ── */
      MuiSlider: {
        styleOverrides: {
          root: {
            '& .MuiSlider-thumb': {
              transition: 'box-shadow 120ms ease, transform 80ms ease',
              /* Hover: expand ripple ring */
              '&:hover': {
                boxShadow: `0 0 0 8px ${c.actionHover}`,
              },
              /* Active drag: larger tactile ring */
              '&.Mui-active': {
                boxShadow: `0 0 0 14px ${c.actionSelected}`,
                '@media (prefers-reduced-motion: no-preference)': {
                  transform: 'scale(1.1) translateX(-50%) translateY(-50%)',
                },
              },
              /* Focus-visible keyboard: brand ring */
              '&.Mui-focusVisible': {
                boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 6px ${c.accentPrimary}`,
              },
            },
          },
        },
      },

      /* ── Feedback: Alerts ── */
      MuiAlert: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            borderRadius: 6,
            border: '1px solid',
          },
          standardError: {
            borderColor: 'var(--pd-status-down-muted)',
            backgroundColor: 'var(--pd-status-down-muted)',
          },
          standardWarning: {
            borderColor: 'rgba(224, 150, 58, 0.16)',
            backgroundColor: 'rgba(224, 150, 58, 0.08)',
          },
        },
      },

      /* ── Feedback: Snackbar ── */
      MuiSnackbar: {
        defaultProps: {
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
        },
      },

      /* ── Overlay: Dialog ── */
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: 'var(--pd-bg-overlay)',
            borderColor: 'var(--pd-border-default)',
          },
        },
      },

      /* ── Overlay: Tooltip ── */
      MuiTooltip: {
        defaultProps: { arrow: true, placement: 'top' },
        styleOverrides: {
          tooltip: {
            backgroundColor: 'var(--pd-bg-raised)',
            border: '1px solid var(--pd-border-default)',
            color: 'var(--pd-text-primary)',
            fontSize: '0.6875rem',
            fontWeight: 500,
            borderRadius: 4,
            padding: '5px 9px',
            boxShadow: mode === 'dark'
              ? '0 4px 12px rgba(0,0,0,0.40)'
              : '0 4px 12px rgba(0,0,0,0.12)',
          },
          arrow: {
            color: 'var(--pd-bg-raised)',
            '&::before': { border: '1px solid var(--pd-border-default)' },
          },
        },
      },

      /* ── Loading: Skeleton ── */
      MuiSkeleton: {
        defaultProps: { animation: 'pulse' },
        styleOverrides: {
          root: {
            backgroundColor: 'var(--pd-bg-raised)',
            borderRadius: 4,
            '&::after': {
              background: mode === 'dark'
                ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent)',
            },
          },
        },
      },

      /* ── Progress ── */
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 2,
            backgroundColor: 'var(--pd-border-subtle)',
            height: 3,
          },
          bar: { borderRadius: 2 },
        },
      },

      /* ── Lists ── */
      MuiListItem: {
        defaultProps: { dense: true },
      },

      /* ── Divider ── */
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: 'var(--pd-border-subtle)' },
        },
      },

      /* ── Breadcrumb / Typography misc ── */
      MuiTypography: {
        defaultProps: { variantMapping: { subtitle1: 'p', subtitle2: 'p' } },
      },
    },
  });
}

/* Default export — dark mode baseline; used as fallback. */
export const theme = createAppTheme('dark');
