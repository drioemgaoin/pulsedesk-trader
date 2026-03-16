/**
 * MUI Theme Factory
 * ═══════════════════════════════════════════════════════════════════
 *
 * This file wires MUI's theme system to brand values defined in
 * brandThemeSource.js.
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
 * 1. Add a mode in brandThemeSource.js.
 * 2. Regenerate tokens.css via `pnpm -C packages/ui tokens:generate`.
 * 3. Add "your-name" to THEME_MODES in themeSlice.ts.
 */

import { createTheme, type PaletteMode } from '@mui/material/styles';
import { SIZES } from './tokens';
import { BRAND_THEME } from './brandThemeSource.js';

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

/* Extend Chip to support size="large" */
declare module '@mui/material/Chip' {
  interface ChipPropsSizeOverrides {
    large: true;
  }
}

/* Extend TextField / InputBase to support size="large" */
declare module '@mui/material/InputBase' {
  interface InputBasePropsSizeOverrides {
    large: true;
  }
}

/*
 * RAW values are centralized in brandThemeSource.js so both theme.ts and
 * tokens.css derive from one source of truth.
 */
const RAW = BRAND_THEME.modes;

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
      error:   { main: c.statusDown,    dark: c.statusDownDark,    light: c.statusDownLight,    contrastText: c.textOnStatus },
      warning: { main: c.statusPending, dark: c.statusPendingDark, light: c.statusPendingLight, contrastText: c.textOnStatus },
      success: { main: c.statusUp,      dark: c.statusUpDark,      light: c.statusUpLight,      contrastText: c.textOnStatus },
      info:    { main: c.accentSecondary, dark: c.accentSecondaryDk, light: c.accentSecondaryLt, contrastText: c.textOnStatus },
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
            boxShadow: c.shadowElevation1,
            border: 'none',
          },
          elevation4: {
            boxShadow: c.shadowElevation4,
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
        defaultProps: { size: 'medium' },
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
        defaultProps: { size: 'medium', variant: 'outlined' },
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
          /*
           * Size slots align input heights with the SIZES scale.
           * Input height = (padding top + bottom) + (fontSize × lineHeight ≈ 1.4) + 2px border.
           * At 13px (0.8125rem) body font, lineHeight 1.4 ≈ 18px:
           *   sm (28px): input padding  4px top/bottom → (4×2) + 18 + 2 = 28 ✓
           *   md (36px): input padding  8px top/bottom → (8×2) + 18 + 2 = 36 ✓ (MUI default)
           *   lg (44px): input padding 12px top/bottom → (12×2) + 18 + 2 = 44 ✓
           */
          sizeSmall: {
            '& .MuiOutlinedInput-input': {
              padding: '4px 12px',
              fontSize: SIZES.sm.fontSize,
            },
          },
          notchedOutline: {
            borderColor: 'var(--pd-border-default)',
            transition: 'border-color 120ms ease',
          },
          root: {
            /* Large size — applied via class selector (sizeLarge slot not in MUI's type map) */
            '&.MuiInputBase-sizeLarge .MuiOutlinedInput-input': {
              padding: '12px 14px',
              fontSize: SIZES.lg.fontSize,
            },
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
      /*
       * Button variants map to the product-level hierarchy:
       *   contained  = Primary   — solid fill, strongest visual weight
       *   outlined   = Secondary — coloured border + tint on hover
       *   text       = Tertiary  — neutral border at rest, coloured on hover
       *
       * State matrix (same UX pattern for all three):
       *   Resting  → base style
       *   Hover    → colour shift (darker / tint bg)
       *   Focus    → hover state + ring  (inset for primary, outer for secondary/tertiary)
       *   Pressed  → darkest / strongest tint + scale(0.975)
       *   Disabled → greyed out, no interaction
       *
       * Sizes: small (28 px) · medium (36 px) · large (44 px)
       */
      MuiButton: {
        defaultProps: { disableElevation: true, disableRipple: false },
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
            letterSpacing: '0.01em',
            transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease, transform 80ms ease',
            '&:active:not(.Mui-disabled)': { transform: 'scale(0.975)' },
          },

          /* ── Sizes — sourced from SIZES in @pulsedesk/ui ── */
          sizeSmall:  { padding: SIZES.sm.padding, fontSize: SIZES.sm.fontSize, height: SIZES.sm.height },
          sizeMedium: { padding: SIZES.md.padding, fontSize: SIZES.md.fontSize, height: SIZES.md.height },
          sizeLarge:  { padding: SIZES.lg.padding, fontSize: SIZES.lg.fontSize, height: SIZES.lg.height },

          /* ── Primary: contained / solid ── */
          containedPrimary: {
            backgroundColor: c.accentPrimary,
            color: c.textOnAccent,
            /* Hover → one shade darker (energy, not lighter / washed-out) */
            '&:hover': { backgroundColor: c.accentPrimaryDark },
            /* Pressed → darkest */
            '&:active, &:hover:active': { backgroundColor: c.accentPrimaryDark, filter: 'brightness(0.88)' },
            /* Focus → hover colour + inset white ring (contained-specific pattern) */
            '&.Mui-focusVisible': {
              backgroundColor: c.accentPrimaryDark,
              boxShadow: c.focusInsetRing,
              outline: 'none',
            },
            '&.Mui-disabled': { backgroundColor: c.actionDisabledBg, color: c.textDisabled },
          },

          /* ── Secondary: outlined + tint ── */
          outlinedPrimary: {
            borderColor: c.accentPrimary,
            color: c.accentPrimary,
            /* Hover → light amber tint bg, border unchanged */
            '&:hover': { backgroundColor: 'var(--pd-accent-primary-muted)', borderColor: c.accentPrimary },
            /* Pressed → stronger tint + darker border/text */
            '&:active, &:hover:active': {
              backgroundColor: 'var(--pd-accent-primary-muted-strong)',
              borderColor: c.accentPrimaryDark,
              color: c.accentPrimaryDark,
            },
            /* Focus → hover state + outer double ring */
            '&.Mui-focusVisible': {
              backgroundColor: 'var(--pd-accent-primary-muted)',
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: 'none',
            },
            '&.Mui-disabled': { borderColor: 'var(--pd-border-subtle)', color: c.textDisabled },
          },

          /* ── Tertiary: ghost with neutral border ── */
          text: {
            border: `1px solid ${c.divider}`,
            color: c.textSecondary,
            /* Hover → border turns accent, text turns accent */
            '&:hover': { backgroundColor: 'transparent', borderColor: c.accentPrimary, color: c.accentPrimary },
            /* Pressed → accent border + light tint bg */
            '&:active, &:hover:active': {
              backgroundColor: 'var(--pd-accent-primary-muted)',
              borderColor: c.accentPrimary,
              color: c.accentPrimary,
            },
            /* Focus → hover state + outer double ring */
            '&.Mui-focusVisible': {
              borderColor: c.accentPrimary,
              color: c.accentPrimary,
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: 'none',
            },
            '&.Mui-disabled': { borderColor: 'var(--pd-border-subtle)', color: c.textDisabled },
          },

          /* ── Semantic colours: success / error / warning (contained only) ── */
          containedSuccess: {
            backgroundColor: c.statusUp,
            color: c.textOnStatus,
            '&:hover': { backgroundColor: c.statusUpLight },
            '&:active, &:hover:active': { backgroundColor: c.statusUpDark },
            '&.Mui-disabled': { backgroundColor: c.actionDisabledBg, color: c.textDisabled },
            '&.Mui-focusVisible': {
              backgroundColor: c.statusUpLight,
              boxShadow: c.focusInsetRing,
              outline: 'none',
            },
          },
          containedError: {
            backgroundColor: c.statusDown,
            color: c.textOnStatus,
            '&:hover': { backgroundColor: c.statusDownLight },
            '&:active, &:hover:active': { backgroundColor: c.statusDownDark },
            '&.Mui-disabled': { backgroundColor: c.actionDisabledBg, color: c.textDisabled },
            '&.Mui-focusVisible': {
              backgroundColor: c.statusDownLight,
              boxShadow: c.focusInsetRing,
              outline: 'none',
            },
          },
          containedWarning: {
            backgroundColor: c.statusPending,
            color: c.textOnStatus,
            '&:hover': { backgroundColor: c.statusPendingLight },
            '&:active, &:hover:active': { backgroundColor: c.statusPendingDark },
            '&.Mui-focusVisible': {
              backgroundColor: c.statusPendingLight,
              boxShadow: c.focusInsetRing,
              outline: 'none',
            },
          },
        },
      },

      /* ── Forms: IconButton ── */
      MuiIconButton: {
        styleOverrides: {
          /* ── Sizes — sourced from SIZES in @pulsedesk/ui ── */
          sizeSmall:  { width: SIZES.sm.iconDimension, height: SIZES.sm.iconDimension },
          sizeMedium: { width: SIZES.md.iconDimension, height: SIZES.md.iconDimension },
          sizeLarge:  { width: SIZES.lg.iconDimension, height: SIZES.lg.iconDimension },
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
        defaultProps: { size: 'medium' },
        styleOverrides: {
          /* ── Sizes — sourced from SIZES in @pulsedesk/ui ── */
          sizeSmall:  { height: SIZES.sm.height, fontSize: SIZES.sm.fontSize, padding: SIZES.sm.togglePadding },
          sizeMedium: { height: SIZES.md.height, fontSize: SIZES.md.fontSize, padding: SIZES.md.togglePadding },
          sizeLarge:  { height: SIZES.lg.height, fontSize: SIZES.lg.fontSize, padding: SIZES.lg.togglePadding },
          root: {
            fontWeight: 600,
            letterSpacing: '0.03em',
            textTransform: 'none',
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
            /* Default selected: brand accent */
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
        defaultProps: { size: 'medium' },
        styleOverrides: {
          /*
           * Size slots — sourced from SIZES in @pulsedesk/ui.
           * sizeSmall is the default (see defaultProps above).
           * sizeMedium and sizeLarge are opt-in via size="medium" | size="large".
           */
          sizeSmall: {
            height:       SIZES.sm.chipHeight,
            fontSize:     SIZES.sm.chipFontSize,
            borderRadius: SIZES.sm.chipBorderRadius,
            '& .MuiChip-label': { padding: SIZES.sm.chipLabelPadding },
          },
          sizeMedium: {
            height:       SIZES.md.chipHeight,
            fontSize:     SIZES.md.chipFontSize,
            borderRadius: SIZES.md.chipBorderRadius,
            '& .MuiChip-label': { padding: SIZES.md.chipLabelPadding },
          },
          root: {
            fontWeight: 600,
            /* Large size — applied via class selector (sizeLarge slot not in MUI's type map) */
            '&.MuiChip-sizeLarge': {
              height:       SIZES.lg.chipHeight,
              fontSize:     SIZES.lg.chipFontSize,
              borderRadius: SIZES.lg.chipBorderRadius,
              '& .MuiChip-label': { padding: SIZES.lg.chipLabelPadding },
            },
            letterSpacing: '0.04em',
            transition: 'background-color 100ms ease, filter 100ms ease, box-shadow 120ms ease, transform 120ms ease',
            /* Clickable chips (onClick provided) get interactive states.
             * Outlined (unselected): opacity changes are nearly invisible on a
             * transparent background — use bg overlays instead.
             * Filled (selected): brightness filter works because the background
             * is a solid color (unlike the low-opacity muted ToggleButton bg). */
            '&.MuiChip-clickable': {
              /* ── Outlined / unselected ── */
              '&.MuiChip-outlined': {
                '&:hover': {
                  /* chipOutlinedHoverBg (10% dark / 8% light) is 2.5× more
                   * visible than the generic actionHover (4%), which reads as
                   * zero change on a transparent chip background */
                  backgroundColor: c.chipOutlinedHoverBg,
                },
                '&:active': {
                  backgroundColor: c.chipOutlinedActiveBg,
                  '@media (prefers-reduced-motion: no-preference)': { transform: 'scale(0.96)' },
                },
                '&:hover:active': {
                  backgroundColor: c.chipOutlinedActiveBg,
                  filter: 'brightness(0.88)',
                  '@media (prefers-reduced-motion: no-preference)': { transform: 'scale(0.96)' },
                },
              },
              /* ── Filled / selected ── */
              '&.MuiChip-filled': {
                '&:hover': { filter: 'brightness(1.15)' },
                '&:active': {
                  filter: 'brightness(0.88)',
                  '@media (prefers-reduced-motion: no-preference)': { transform: 'scale(0.96)' },
                },
                '&:hover:active': {
                  filter: 'brightness(0.82)',
                  '@media (prefers-reduced-motion: no-preference)': { transform: 'scale(0.96)' },
                },
              },
              /* ── Focus ring — same pattern as other interactive elements ── */
              '&.Mui-focusVisible': {
                boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
                outline: 'none',
              },
              '&.Mui-focusVisible:hover': {
                boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimaryLight}`,
              },
            },
          },
          /* Outlined variant — used for status chips in blotter */
          outlined: {
            borderWidth: 1,
          },
          /* colorXxx overrides intentionally omitted.
           * MUI's defaults give each color a solid palette bg + contrastText,
           * which lets filter: brightness() hover work on all filled chips.
           * Customising text/bg here caused same-color-on-same-color invisibility. */
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
            borderColor: 'var(--pd-status-pending-muted-strong)',
            backgroundColor: 'var(--pd-status-pending-muted)',
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
            boxShadow: c.shadowTooltip,
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
              background: c.skeletonShimmer,
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
