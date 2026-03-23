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

import { createTheme, type PaletteMode } from "@mui/material/styles";
import { SIZES } from "./tokens";
import { BRAND_THEME, SPACING_BASE } from "./brandThemeSource.js";

/* ── MUI palette extension typings ─────────────────────────────────── */
declare module "@mui/material/styles" {
  interface Palette {
    trading: {
      uptick: string; /* maps to var(--pd-status-up)   */
      downtick: string; /* maps to var(--pd-status-down)  */
      pending: string; /* maps to var(--pd-status-pending) */
      neutral: string; /* maps to var(--pd-status-neutral) */
    };
  }
  interface PaletteOptions {
    trading?: {
      uptick?: string;
      downtick?: string;
      pending?: string;
      neutral?: string;
    };
  }
  interface TypeBackground {
    elevated: string; /* maps to var(--pd-bg-raised) */
  }
}
declare module "@mui/material/styles/createPalette" {
  interface TypeBackground {
    elevated: string;
  }
}

/* Extend Chip to support size="large" */
declare module "@mui/material/Chip" {
  interface ChipPropsSizeOverrides {
    large: true;
  }
}

/* Extend TextField / InputBase to support size="large" */
declare module "@mui/material/TextField" {
  interface TextFieldPropsSizeOverrides {
    large: true;
  }
}
declare module "@mui/material/FormControl" {
  interface FormControlPropsSizeOverrides {
    large: true;
  }
}
declare module "@mui/material/InputBase" {
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
        default: c.bgCanvas,
        paper: c.bgSurface,
        elevated: c.bgRaised,
      },
      divider: c.divider,
      text: {
        primary: c.textPrimary,
        secondary: c.textSecondary,
        disabled: c.textDisabled,
      },
      action: {
        hover: c.actionHover,
        selected: c.actionSelected,
        disabledBackground: c.actionDisabledBg,
      },
      primary: {
        main: c.accentPrimary,
        dark: c.accentPrimaryDark,
        light: c.accentPrimaryLight,
        contrastText: c.textOnAccent,
      },
      secondary: {
        main: c.accentSecondary,
        dark: c.accentSecondaryDk,
        light: c.accentSecondaryLt,
        contrastText: c.accentOnSecondary,
      },
      error: {
        main: c.statusDown,
        dark: c.statusDownDark,
        light: c.statusDownLight,
        contrastText: c.textOnStatus,
      },
      warning: {
        main: c.statusPending,
        dark: c.statusPendingDark,
        light: c.statusPendingLight,
        contrastText: c.textOnStatus,
      },
      success: {
        main: c.statusUp,
        dark: c.statusUpDark,
        light: c.statusUpLight,
        contrastText: c.textOnStatus,
      },
      info: {
        main: c.accentSecondary,
        dark: c.accentSecondaryDk,
        light: c.accentSecondaryLt,
        contrastText: c.textOnStatus,
      },
      /*
       * trading.* is entirely custom — MUI never calls alpha() on it.
       * sx={{ color: 'trading.uptick' }} renders `color: var(--pd-status-up)`
       * in the DOM, so DevTools shows the token name directly.
       */
      trading: {
        uptick: "var(--pd-status-up)",
        downtick: "var(--pd-status-down)",
        pending: "var(--pd-status-pending)",
        neutral: "var(--pd-status-neutral)",
      },
    },

    /* ── Typography ─────────────────────────────────────────────── */
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      fontSize: 13,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h4: {
        fontSize: "1.5rem",
        fontWeight: 700,
        letterSpacing: "-0.025em",
        lineHeight: 1.25,
      },
      h5: {
        fontSize: "1.25rem",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.3,
      },
      h6: {
        fontSize: "1.0rem",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        lineHeight: 1.4,
      },
      subtitle1: { fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.4 },
      subtitle2: { fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.4 },
      body1: { fontSize: "0.8125rem", lineHeight: 1.5 },
      body2: { fontSize: "0.75rem", lineHeight: 1.5 },
      caption: {
        fontSize: "0.6875rem" /* 11px */,
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: "0.07em",
      },
      overline: {
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.10em",
        textTransform: "uppercase" as const,
        lineHeight: 1.4,
      },
      button: {
        textTransform: "none" as const,
        fontWeight: 600,
        letterSpacing: "0.01em",
      },
    },

    /* ── Spacing & shape ────────────────────────────────────────── */
    spacing: SPACING_BASE /* 1 unit = 4px  →  spacing(2) = 8px */,
    shape: { borderRadius: 6 },

    /* ── Component overrides: flat, professional design ─────────── */
    components: {
      /* ── Layout: AppBar ── */
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: "var(--pd-bg-surface)",
            borderBottom: "1px solid var(--pd-appbar-border)",
            boxShadow: "none",
          },
        },
      },

      /* ── Layout: Paper / Card ── */
      MuiPaper: {
        defaultProps: { elevation: 0, variant: "outlined" },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: "var(--pd-bg-surface)",
            borderColor: "var(--pd-border-subtle)",
          },
          /* elevation variant (e.g. Snackbar fills) keeps a subtle shadow */
          elevation1: {
            boxShadow: c.shadowElevation1,
            border: "none",
          },
          elevation4: {
            boxShadow: c.shadowElevation4,
            border: "none",
          },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0, variant: "outlined" },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: "var(--pd-bg-surface)",
            borderColor: "var(--pd-border-subtle)",
          },
        },
      },

      /* ── Navigation: Tabs ── */
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 40 },
          indicator: {
            backgroundColor: "var(--pd-accent-primary)",
            height: 2,
            borderRadius: "2px 2px 0 0",
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          root: ({ theme }: { theme: any }) => ({
            minHeight: 40,
            fontSize: "0.8125rem",
            fontWeight: 500,
            textTransform: "none",
            letterSpacing: "0",
            color: "var(--pd-text-secondary)",
            padding: theme.spacing(0, 4), // 0px 16px
            transition:
              "color 120ms ease, background 120ms ease, box-shadow 120ms ease",
            "&.Mui-selected": {
              color: "var(--pd-text-primary)",
              fontWeight: 600,
            },
            "&:hover": {
              color: "var(--pd-text-primary)",
              background: "var(--pd-hover)",
            },
            "&:active": {
              background: c.actionSelected,
            },
            "&.Mui-focusVisible": {
              boxShadow: `inset 0 0 0 2px ${c.accentPrimary}`,
              outline: "none",
            },
          }),
        },
      },

      /* ── Tables ── */
      MuiTable: {
        defaultProps: { size: "medium" },
      },

      MuiTableCell: {
        styleOverrides: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          root: ({ theme }: { theme: any }) => ({
            padding: theme.spacing(1.5, 2.5), // 6px 10px
            borderBottomColor: "var(--pd-border-subtle)",
            fontSize: "0.8125rem",
          }),
          head: {
            color: "var(--pd-text-secondary)",
            fontWeight: 600,
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            borderBottomColor: "var(--pd-border-default)",
            whiteSpace: "nowrap",
          },
          footer: {
            borderTopColor: "var(--pd-border-default)",
            borderBottom: "none",
          },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            "&.MuiTableRow-hover:hover": {
              backgroundColor: "var(--pd-hover)",
            },
            "&.Mui-selected": {
              backgroundColor: "var(--pd-selected)",
              "&:hover": {
                backgroundColor: "var(--pd-selected)",
              },
            },
            /* Keyboard focus ring for navigable rows (tabIndex=0) */
            "&:focus-visible": {
              outline: `2px solid ${c.accentPrimary}`,
              outlineOffset: "-2px",
              zIndex: 1,
              position: "relative",
            },
          },
        },
      },

      /* ── Tables: Sort label ── */
      MuiTableSortLabel: {
        styleOverrides: {
          root: {
            transition: "color 120ms ease",
            "&:hover": {
              color: "var(--pd-text-primary)",
            },
            "&.Mui-active": {
              color: "var(--pd-text-primary)",
              "& .MuiTableSortLabel-icon": {
                opacity: 1,
                color: "var(--pd-accent-primary)",
              },
            },
            "&.Mui-focusVisible": {
              outline: `1px solid ${c.accentPrimary}`,
              outlineOffset: 2,
              borderRadius: 2,
            },
          },
        },
      },

      /* ── Forms: Inputs ── */
      MuiTextField: {
        defaultProps: { size: "medium", variant: "outlined" },
      },

      MuiInputBase: {
        styleOverrides: {
          root: {
            fontSize: "0.8125rem",
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          /*
           * Size slots align input heights with the SIZES scale (single source of truth).
           * Input height = (padding top + bottom) + (fontSize × lineHeight ≈ 1.4) + 2px border.
           * At 13px body font, lineHeight 1.4 ≈ 18px:
           *   sm (32px): padding  6px top/bottom → (6×2)  + 18 + 2 = 32 ✓
           *   md (40px): padding 10px top/bottom → (10×2) + 18 + 2 = 40 ✓
           *   lg (48px): padding 14px top/bottom → (14×2) + 18 + 2 = 48 ✓
           *
           * All three sizes use ownerState — consistent single code path.
           * MUI only generates MuiInputBase-sizeSmall so class-selector approaches
           * for md/lg are dead code; ownerState is the only reliable path.
           * MUI default medium padding is 16.5px (≈56px height), not our 10px target.
           */
          notchedOutline: {
            borderColor: "var(--pd-border-default)",
            transition: "border-color 120ms ease",
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          root: ({ ownerState, theme }: { ownerState: any; theme: any }) => ({
            /* All three sizes handled here via ownerState — consistent with md/lg pattern.
             * Small uses ownerState too (not sizeSmall slot) so spacing scales uniformly.
             *   sm (32px): spacing(1.5, 3)   = 6px 12px  → (6×2) + 18 + 2 = 32 ✓
             *   md (40px): spacing(2.5, 3.5) = 10px 14px → (10×2) + 18 + 2 = 40 ✓
             *   lg (48px): spacing(3.5, 3.5) = 14px 14px → (14×2) + 18 + 2 = 48 ✓ */
            ...(ownerState.size === "small" && {
              "& .MuiOutlinedInput-input": {
                padding: theme.spacing(1.5, 3),
                fontSize: SIZES.sm.fontSize,
              },
            }),
            ...(ownerState.size === "medium" && {
              "& .MuiOutlinedInput-input": {
                padding: theme.spacing(2.5, 3.5),
                fontSize: SIZES.md.fontSize,
              },
            }),
            ...(ownerState.size === "large" && {
              "& .MuiOutlinedInput-input": {
                padding: theme.spacing(3.5, 3.5),
                fontSize: SIZES.lg.fontSize,
              },
            }),
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.text.secondary,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--pd-accent-primary)",
              borderWidth: 1,
            },
            /* Hover + Focused — 2px amber border distinguishes from focused alone (1px) */
            "&:hover.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: 2,
              borderColor: "var(--pd-accent-primary)",
            },
            "&.Mui-disabled": {
              opacity: 0.5,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--pd-border-subtle)",
              },
            },
            "&.Mui-error .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--pd-status-down)",
            },
          }),
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          root: ({ ownerState }: { ownerState: any }) => ({
            fontSize: "0.8125rem",
            color: "var(--pd-text-secondary)",
            "&.Mui-focused": { color: "var(--pd-accent-primary)" },
            /*
             * Resting label positions for custom-sized inputs (only when label is inside).
             * MUI's sizeSmall slot handles small automatically.
             * Each transform centres the label in the visible input area:
             *
             * outlined — translate(14px, Y): Y = top-border(1) + input-padding-top
             *   md: 1 + 10 = 11 → translate(14px, 10px)
             *   lg: 1 + 14 = 15 → translate(14px, 14px)
             *
             * filled — translate(12px, Y): Y = half of top-padding (label sits in top zone)
             *   md: 24 / 2 = 12 → translate(12px, 12px)
             *   lg: 28 / 2 = 14 → translate(12px, 14px)
             *
             * standard — translate(0, Y): Y = input-padding-top + half text height (9px)
             *   md: 7  + 9 = 16 → translate(0, 16px)
             *   lg: 11 + 9 = 20 → translate(0, 20px)
             */
            ...(!ownerState.shrink &&
              ownerState.variant === "outlined" &&
              ownerState.size === "medium" && {
                transform: "translate(14px, 10px) scale(1)",
              }),
            ...(!ownerState.shrink &&
              ownerState.variant === "outlined" &&
              ownerState.size === "large" && {
                transform: "translate(14px, 14px) scale(1)",
              }),
            ...(!ownerState.shrink &&
              ownerState.variant === "filled" &&
              ownerState.size === "medium" && {
                transform: "translate(12px, 12px) scale(1)",
              }),
            ...(!ownerState.shrink &&
              ownerState.variant === "filled" &&
              ownerState.size === "large" && {
                transform: "translate(12px, 14px) scale(1)",
              }),
            ...(!ownerState.shrink &&
              ownerState.variant === "standard" &&
              ownerState.size === "medium" && {
                transform: "translate(0, 16px) scale(1)",
              }),
            ...(!ownerState.shrink &&
              ownerState.variant === "standard" &&
              ownerState.size === "large" && {
                transform: "translate(0, 20px) scale(1)",
              }),
          }),
        },
      },

      /*
       * MuiFilledInput / MuiInput — same SIZES scale as MuiOutlinedInput.
       *
       * Filled: label floats inside the background so the total height is larger
       * than outlined (the top padding reserves space for the floating label).
       * The relative scale (sm < md < lg) still mirrors SIZES proportions (+8px/step).
       *   sm: top(20) + bottom(6)  + text(18) = 44px
       *   md: top(24) + bottom(10) + text(18) = 52px
       *   lg: top(28) + bottom(14) + text(18) = 60px
       *
       * Standard: underline-only, no background — padding directly sets the
       * visible click/touch area around the text.
       *   sm: top(3)  + bottom(5)  + text(18) = 26px
       *   md: top(7)  + bottom(8)  + text(18) = 33px
       *   lg: top(11) + bottom(12) + text(18) = 41px
       *
       * All three sizes use ownerState callbacks (same pattern as MuiOutlinedInput).
       * No sizeSmall slot — ownerState is consistent across all sizes.
       */
      MuiFilledInput: {
        styleOverrides: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          root: ({ ownerState, theme }: { ownerState: any; theme: any }) => ({
            /* sm: top(20) + bottom(6)  + text(18) = 44px
             * md: top(24) + bottom(10) + text(18) = 52px
             * lg: top(28) + bottom(14) + text(18) = 60px */
            ...(ownerState.size === "small" && {
              "& .MuiFilledInput-input": {
                padding: theme.spacing(5, 3, 1.5), // 20px 12px 6px
                fontSize: SIZES.sm.fontSize,
              },
            }),
            ...(ownerState.size === "medium" && {
              "& .MuiFilledInput-input": {
                padding: theme.spacing(6, 3, 2.5), // 24px 12px 10px
                fontSize: SIZES.md.fontSize,
              },
            }),
            ...(ownerState.size === "large" && {
              "& .MuiFilledInput-input": {
                padding: theme.spacing(7, 3, 3.5), // 28px 12px 14px
                fontSize: SIZES.lg.fontSize,
              },
            }),
          }),
        },
      },

      MuiInput: {
        styleOverrides: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          root: ({ ownerState, theme }: { ownerState: any; theme: any }) => ({
            /* sm: top(3)  + bottom(5)  + text(18) = 26px
             * md: top(7)  + bottom(8)  + text(18) = 33px
             * lg: top(11) + bottom(12) + text(18) = 41px */
            ...(ownerState.size === "small" && {
              "& .MuiInput-input": {
                padding: theme.spacing(0.75, 0, 1.25), // 3px 0 5px
                fontSize: SIZES.sm.fontSize,
              },
            }),
            ...(ownerState.size === "medium" && {
              "& .MuiInput-input": {
                padding: theme.spacing(1.75, 0, 2), // 7px 0 8px
                fontSize: SIZES.md.fontSize,
              },
            }),
            ...(ownerState.size === "large" && {
              "& .MuiInput-input": {
                padding: theme.spacing(2.75, 0, 3), // 11px 0 12px
                fontSize: SIZES.lg.fontSize,
              },
            }),
          }),
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
       * Sizes: small (32 px) · medium (40 px) · large (48 px)
       */
      MuiButton: {
        defaultProps: { disableElevation: true, disableRipple: false },
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
            letterSpacing: "0.01em",
            transition:
              "background 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease, transform 80ms ease",
            "&:active:not(.Mui-disabled)": { transform: "scale(0.975)" },
          },

          /* ── Sizes — sourced from SIZES in @pulsedesk/ui ── */
          sizeSmall: {
            padding: SIZES.sm.padding,
            fontSize: SIZES.sm.fontSize,
            height: SIZES.sm.height,
          },
          sizeMedium: {
            padding: SIZES.md.padding,
            fontSize: SIZES.md.fontSize,
            height: SIZES.md.height,
          },
          sizeLarge: {
            padding: SIZES.lg.padding,
            fontSize: SIZES.lg.fontSize,
            height: SIZES.lg.height,
          },

          /* ── Primary: contained / solid ── */
          containedPrimary: {
            backgroundColor: c.accentPrimary,
            color: c.textOnAccent,
            "&:hover": { backgroundColor: c.accentPrimaryDark },
            "&:active, &:hover:active": {
              backgroundColor: c.accentPrimaryDark,
              filter: "brightness(0.88)",
            },
            "&.MuiButton-loading": {
              backgroundColor: c.accentPrimaryDark,
              filter: "brightness(0.88)",
              color: c.textOnAccent,
            },
            /* Focus → default appearance + inset ring only, no background change */
            "&.Mui-focusVisible": {
              boxShadow: c.focusInsetRing,
              outline: "none",
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              backgroundColor: c.actionDisabledBg,
              color: c.textDisabled,
            },
          },

          /* ── Secondary: outlined + tint ── */
          outlinedPrimary: {
            borderColor: c.accentPrimary,
            color: c.accentPrimary,
            "&:hover": {
              backgroundColor: "var(--pd-accent-primary-muted)",
              borderColor: c.accentPrimary,
            },
            "&:active, &:hover:active": {
              backgroundColor: c.accentPrimaryLight,
              borderColor: c.accentPrimaryDark,
              color: c.accentPrimaryDark,
            },
            "&.MuiButton-loading": {
              backgroundColor: c.accentPrimaryLight,
              borderColor: c.accentPrimaryDark,
              color: c.accentPrimaryDark,
            },
            /* Focus → default appearance + outer ring only */
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: "none",
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              borderColor: "var(--pd-border-subtle)",
              color: c.textDisabled,
            },
          },

          /* ── Tertiary: ghost with neutral border ── */
          text: {
            border: `1px solid ${c.divider}`,
            color: c.textSecondary,
            "&:hover": {
              backgroundColor: "transparent",
              borderColor: c.accentPrimary,
              color: c.accentPrimary,
            },
            "&:active, &:hover:active": {
              backgroundColor: "var(--pd-accent-primary-muted)",
              borderColor: c.accentPrimary,
              color: c.accentPrimary,
            },
            "&.MuiButton-loading": {
              backgroundColor: "var(--pd-accent-primary-muted)",
              borderColor: c.accentPrimary,
              color: c.accentPrimary,
            },
            /* Focus → default appearance + outer ring only */
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: "none",
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              borderColor: "var(--pd-border-subtle)",
              color: c.textDisabled,
            },
          },

          /* ── Semantic colours: outlined variants ── */
          outlinedSuccess: {
            borderColor: c.statusUp,
            color: c.statusUp,
            "&:hover": {
              backgroundColor: "var(--pd-status-up-muted)",
              borderColor: c.statusUp,
            },
            "&:active, &:hover:active": {
              backgroundColor: c.statusUpLight,
              borderColor: c.statusUpDark,
              color: c.statusUpDark,
            },
            "&.MuiButton-loading": {
              backgroundColor: c.statusUpLight,
              borderColor: c.statusUpDark,
              color: c.statusUpDark,
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.statusUp}`,
              outline: "none",
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              borderColor: "var(--pd-border-subtle)",
              color: c.textDisabled,
            },
          },
          outlinedError: {
            borderColor: c.statusDown,
            color: c.statusDown,
            "&:hover": {
              backgroundColor: "var(--pd-status-down-muted)",
              borderColor: c.statusDown,
            },
            "&:active, &:hover:active": {
              backgroundColor: c.statusDownLight,
              borderColor: c.statusDownDark,
              color: c.statusDownDark,
            },
            "&.MuiButton-loading": {
              backgroundColor: c.statusDownLight,
              borderColor: c.statusDownDark,
              color: c.statusDownDark,
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.statusDown}`,
              outline: "none",
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              borderColor: "var(--pd-border-subtle)",
              color: c.textDisabled,
            },
          },
          outlinedWarning: {
            borderColor: c.statusPending,
            color: c.statusPending,
            "&:hover": {
              backgroundColor: "var(--pd-status-pending-muted)",
              borderColor: c.statusPending,
            },
            "&:active, &:hover:active": {
              backgroundColor: c.statusPendingLight,
              borderColor: c.statusPendingDark,
              color: c.statusPendingDark,
            },
            "&.MuiButton-loading": {
              backgroundColor: c.statusPendingLight,
              borderColor: c.statusPendingDark,
              color: c.statusPendingDark,
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.statusPending}`,
              outline: "none",
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              borderColor: "var(--pd-border-subtle)",
              color: c.textDisabled,
            },
          },
          outlinedInfo: {
            borderColor: c.accentSecondary,
            color: c.accentSecondary,
            "&:hover": {
              backgroundColor: "var(--pd-accent-secondary-muted)",
              borderColor: c.accentSecondary,
            },
            "&:active, &:hover:active": {
              backgroundColor: c.accentSecondaryLt,
              borderColor: c.accentSecondaryDk,
              color: c.accentSecondaryDk,
            },
            "&.MuiButton-loading": {
              backgroundColor: c.accentSecondaryLt,
              borderColor: c.accentSecondaryDk,
              color: c.accentSecondaryDk,
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentSecondary}`,
              outline: "none",
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              borderColor: "var(--pd-border-subtle)",
              color: c.textDisabled,
            },
          },

          /* ── Semantic colours: contained ── */
          containedSuccess: {
            backgroundColor: c.statusUp,
            color: c.textOnStatus,
            "&:hover": { backgroundColor: c.statusUpLight },
            "&:active, &:hover:active": { backgroundColor: c.statusUpDark },
            "&.MuiButton-loading": {
              backgroundColor: c.statusUpDark,
              color: c.textOnStatus,
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              backgroundColor: c.actionDisabledBg,
              color: c.textDisabled,
            },
            "&.Mui-focusVisible": {
              boxShadow: c.focusInsetRing,
              outline: "none",
            },
          },
          containedError: {
            backgroundColor: c.statusDown,
            color: c.textOnStatus,
            "&:hover": { backgroundColor: c.statusDownLight },
            "&:active, &:hover:active": { backgroundColor: c.statusDownDark },
            "&.MuiButton-loading": {
              backgroundColor: c.statusDownDark,
              color: c.textOnStatus,
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              backgroundColor: c.actionDisabledBg,
              color: c.textDisabled,
            },
            "&.Mui-focusVisible": {
              boxShadow: c.focusInsetRing,
              outline: "none",
            },
          },
          containedWarning: {
            backgroundColor: c.statusPending,
            color: c.textOnStatus,
            "&:hover": { backgroundColor: c.statusPendingLight },
            "&:active, &:hover:active": {
              backgroundColor: c.statusPendingDark,
            },
            "&.MuiButton-loading": {
              backgroundColor: c.statusPendingDark,
              color: c.textOnStatus,
            },
            "&.Mui-focusVisible": {
              boxShadow: c.focusInsetRing,
              outline: "none",
            },
          },
          containedInfo: {
            backgroundColor: c.accentSecondary,
            color: c.textOnStatus,
            "&:hover": { backgroundColor: c.accentSecondaryDk },
            "&:active, &:hover:active": {
              backgroundColor: c.accentSecondaryDk,
              filter: "brightness(0.88)",
            },
            "&.MuiButton-loading": {
              backgroundColor: c.accentSecondaryDk,
              filter: "brightness(0.88)",
              color: c.textOnStatus,
            },
            "&.Mui-disabled:not(.MuiButton-loading)": {
              backgroundColor: c.actionDisabledBg,
              color: c.textDisabled,
            },
            "&.Mui-focusVisible": {
              boxShadow: c.focusInsetRing,
              outline: "none",
            },
          },
        },
      },

      /* ── Forms: IconButton ── */
      MuiIconButton: {
        styleOverrides: {
          /* ── Sizes — sourced from SIZES in @pulsedesk/ui ── */
          sizeSmall: {
            width: SIZES.sm.iconDimension,
            height: SIZES.sm.iconDimension,
          },
          sizeMedium: {
            width: SIZES.md.iconDimension,
            height: SIZES.md.iconDimension,
          },
          sizeLarge: {
            width: SIZES.lg.iconDimension,
            height: SIZES.lg.iconDimension,
          },
          root: {
            borderRadius: 6,
            transition:
              "background 120ms ease, color 120ms ease, box-shadow 120ms ease, transform 80ms ease",
            "&:hover": {
              backgroundColor: c.actionHover,
            },
            "&:active": {
              backgroundColor: c.actionSelected,
            },
            /* hover+active together → clear pressed state regardless of hover */
            "&:hover:active": {
              backgroundColor: c.actionSelected,
            },
            "@media (prefers-reduced-motion: no-preference)": {
              "&:active:not(.Mui-disabled)": {
                transform: "scale(0.84)",
              },
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: "none",
            },
            "&.Mui-focusVisible:hover": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimaryLight}`,
            },
            "&.Mui-disabled": {
              opacity: 0.38,
            },
          },
        },
      },

      /* ── Forms: ToggleButtonGroup ── */
      MuiToggleButtonGroup: {
        styleOverrides: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          root: ({ theme }: { theme: any }) => ({
            gap: theme.spacing(2),
            "& .MuiToggleButtonGroup-grouped": {
              borderRadius: "6px !important",
              border: "1px solid var(--pd-border-default) !important",
              margin: 0,
            },
          }),
        },
      },

      MuiToggleButton: {
        defaultProps: { size: "medium" },
        styleOverrides: {
          /* ── Sizes — sourced from SIZES in @pulsedesk/ui ── */
          sizeSmall: {
            height: SIZES.sm.height,
            fontSize: SIZES.sm.fontSize,
            padding: SIZES.sm.togglePadding,
          },
          sizeMedium: {
            height: SIZES.md.height,
            fontSize: SIZES.md.fontSize,
            padding: SIZES.md.togglePadding,
          },
          sizeLarge: {
            height: SIZES.lg.height,
            fontSize: SIZES.lg.fontSize,
            padding: SIZES.lg.togglePadding,
          },
          root: {
            fontWeight: 600,
            letterSpacing: "0.03em",
            textTransform: "none",
            color: "var(--pd-text-secondary)",
            borderColor: "var(--pd-border-default)",
            transition:
              "color 100ms, background 100ms, border-color 100ms, box-shadow 120ms ease",
            "&:hover": {
              backgroundColor: "var(--pd-hover)",
              color: "var(--pd-text-primary)",
            },
            "&:active": {
              backgroundColor: c.actionSelected,
            },
            /* hover+active → same pressed feel regardless of how you got there */
            "&:hover:active": {
              backgroundColor: c.actionSelected,
              filter: "brightness(0.92)",
            },
            /* Default selected: brand accent */
            "&.Mui-selected": {
              color: "var(--pd-accent-primary)",
              backgroundColor: "var(--pd-accent-primary-muted)",
              borderColor: "var(--pd-accent-primary) !important",
              "&:hover": {
                /* Noticeably stronger fill — clearly different from unselected */
                backgroundColor: "var(--pd-accent-primary-muted-strong)",
                filter: "none",
              },
              /* selected+active or selected+hover+active → visible press */
              "&:active": {
                backgroundColor: "var(--pd-accent-primary-muted-strong)",
                filter: "brightness(0.88)",
              },
              "&:hover:active": {
                backgroundColor: "var(--pd-accent-primary-muted-strong)",
                filter: "brightness(0.82)",
              },
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: "none",
            },
            "&.Mui-focusVisible:hover": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimaryLight}`,
            },
            "&.Mui-disabled": {
              opacity: 0.4,
            },
          },
        },
      },

      /* ── Data: Chip / Badge ── */
      MuiChip: {
        defaultProps: { size: "medium" },
        styleOverrides: {
          /*
           * Size slots — sourced from SIZES in @pulsedesk/ui.
           * sizeSmall is the default (see defaultProps above).
           * sizeMedium and sizeLarge are opt-in via size="medium" | size="large".
           */
          sizeSmall: {
            height: SIZES.sm.chipHeight,
            fontSize: SIZES.sm.chipFontSize,
            borderRadius: SIZES.sm.chipBorderRadius,
            "& .MuiChip-label": { padding: SIZES.sm.chipLabelPadding },
          },
          sizeMedium: {
            height: SIZES.md.chipHeight,
            fontSize: SIZES.md.chipFontSize,
            borderRadius: SIZES.md.chipBorderRadius,
            "& .MuiChip-label": { padding: SIZES.md.chipLabelPadding },
          },
          root: {
            fontWeight: 600,
            /* Large size — applied via class selector (sizeLarge slot not in MUI's type map) */
            "&.MuiChip-sizeLarge": {
              height: SIZES.lg.chipHeight,
              fontSize: SIZES.lg.chipFontSize,
              borderRadius: SIZES.lg.chipBorderRadius,
              "& .MuiChip-label": { padding: SIZES.lg.chipLabelPadding },
            },
            letterSpacing: "0.04em",
            transition:
              "background-color 100ms ease, filter 100ms ease, box-shadow 120ms ease, transform 120ms ease",
            /* Clickable chips (onClick provided) get interactive states.
             * Outlined (unselected): opacity changes are nearly invisible on a
             * transparent background — use bg overlays instead.
             * Filled (selected): brightness filter works because the background
             * is a solid color (unlike the low-opacity muted ToggleButton bg). */
            "&.MuiChip-clickable": {
              /* ── Outlined / unselected ── */
              "&.MuiChip-outlined": {
                "&:hover": {
                  /* chipOutlinedHoverBg (10% dark / 8% light) is 2.5× more
                   * visible than the generic actionHover (4%), which reads as
                   * zero change on a transparent chip background */
                  backgroundColor: c.chipOutlinedHoverBg,
                },
                "&:active": {
                  backgroundColor: c.chipOutlinedActiveBg,
                  "@media (prefers-reduced-motion: no-preference)": {
                    transform: "scale(0.96)",
                  },
                },
                "&:hover:active": {
                  backgroundColor: c.chipOutlinedActiveBg,
                  filter: "brightness(0.88)",
                  "@media (prefers-reduced-motion: no-preference)": {
                    transform: "scale(0.96)",
                  },
                },
              },
              /* ── Filled / selected ── */
              "&.MuiChip-filled": {
                "&:hover": { filter: "brightness(1.15)" },
                "&:active": {
                  filter: "brightness(0.88)",
                  "@media (prefers-reduced-motion: no-preference)": {
                    transform: "scale(0.96)",
                  },
                },
                "&:hover:active": {
                  filter: "brightness(0.82)",
                  "@media (prefers-reduced-motion: no-preference)": {
                    transform: "scale(0.96)",
                  },
                },
              },
              /* ── Focus ring — same pattern as other interactive elements ── */
              "&.Mui-focusVisible": {
                boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
                outline: "none",
              },
              "&.Mui-focusVisible:hover": {
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
            transition: "background 120ms ease",
            "&:hover": {
              backgroundColor: c.actionHover,
            },
            "&:active": {
              backgroundColor: c.actionSelected,
            },
            "&.Mui-focusVisible": {
              backgroundColor: "transparent",
              boxShadow: `inset 0 0 0 2px ${c.accentPrimary}`,
              outline: "none",
            },
          },
        },
      },

      /* ── Forms: Checkbox ── */
      MuiCheckbox: {
        styleOverrides: {
          root: {
            transition: "color 120ms ease, box-shadow 120ms ease",
            borderRadius: 4,
            /* Hover: hint the checked color even when unchecked */
            "&:hover": {
              backgroundColor: c.actionHover,
            },
            /* hover+active → clear press, same as active */
            "&:hover:active": {
              backgroundColor: c.actionSelected,
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: "none",
              borderRadius: 4,
            },
            "&.Mui-disabled": {
              opacity: 0.38,
            },
          },
        },
      },

      /* ── Forms: Radio ── */
      MuiRadio: {
        styleOverrides: {
          root: {
            transition: "color 120ms ease, box-shadow 120ms ease",
            "&:hover": {
              backgroundColor: c.actionHover,
            },
            "&:hover:active": {
              backgroundColor: c.actionSelected,
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 2px ${c.bgSurface}, 0 0 0 4px ${c.accentPrimary}`,
              outline: "none",
            },
            "&.Mui-disabled": {
              opacity: 0.38,
            },
          },
        },
      },

      /* ── Forms: Slider ── */
      MuiSlider: {
        styleOverrides: {
          root: {
            "& .MuiSlider-thumb": {
              transition: "box-shadow 120ms ease, transform 80ms ease",
              /* Hover: expand ripple ring */
              "&:hover": {
                boxShadow: `0 0 0 8px ${c.actionHover}`,
              },
              /* Active drag: larger tactile ring */
              "&.Mui-active": {
                boxShadow: `0 0 0 14px ${c.actionSelected}`,
                "@media (prefers-reduced-motion: no-preference)": {
                  transform: "scale(1.1) translateX(-50%) translateY(-50%)",
                },
              },
              /* Focus-visible keyboard: brand ring */
              "&.Mui-focusVisible": {
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
            fontSize: "0.8125rem",
            borderRadius: 6,
            border: "1px solid",
          },
          // Solid status colour for the border; muted fill for the background.
          // CSS custom properties switch automatically in dark / light mode.
          standardSuccess: {
            borderColor: "var(--pd-status-up)",
            backgroundColor: "var(--pd-status-up-muted)",
          },
          standardInfo: {
            borderColor: "var(--pd-accent-secondary)",
            backgroundColor: "var(--pd-accent-secondary-muted)",
          },
          standardWarning: {
            borderColor: "var(--pd-status-pending)",
            backgroundColor: "var(--pd-status-pending-muted)",
          },
          standardError: {
            borderColor: "var(--pd-status-down)",
            backgroundColor: "var(--pd-status-down-muted)",
          },
        },
      },

      /* ── Feedback: Snackbar ── */
      MuiSnackbar: {
        defaultProps: {
          anchorOrigin: { vertical: "bottom", horizontal: "right" },
          // React 19 + react-transition-group v4: Snackbar unmounts entirely when
          // closed (!open && exited → null) and remounts fresh when open=true. The
          // fresh Grow (appear=true, in=true) calls onEnter(nodeRef.current) inside
          // componentDidMount, but nodeRef.current is null at that point. appear=false
          // skips the mount-time enter animation; the Snackbar appears instantly.
          slotProps: { transition: { appear: false } },
        },
      },

      /* ── Overlay: Dialog ── */
      MuiDialog: {
        defaultProps: {
          // React 19 + react-transition-group v4: Dialog uses Fade with appear=true
          // hardcoded. When a Dialog opens fresh, componentDidMount fires with
          // nodeRef.current=null → reflow(null) crashes. appear=false skips the
          // mount-time fade; the dialog appears instantly.
          TransitionProps: { appear: false },
        },
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            backgroundColor: "var(--pd-bg-overlay)",
            borderColor: "var(--pd-border-default)",
          },
        },
      },

      /* ── Overlay: Tooltip ── */
      MuiTooltip: {
        defaultProps: {
          arrow: true,
          placement: "top",
        },
        styleOverrides: {
          tooltip: {
            backgroundColor: "var(--pd-bg-raised)",
            border: "1px solid var(--pd-border-default)",
            color: "var(--pd-text-primary)",
            fontSize: "0.6875rem",
            fontWeight: 500,
            borderRadius: 4,
            padding: "5px 9px",
            boxShadow: c.shadowTooltip,
          },
          arrow: {
            color: "var(--pd-bg-raised)",
            "&::before": { border: "1px solid var(--pd-border-default)" },
          },
        },
      },

      /* ── Loading: Skeleton ── */
      MuiSkeleton: {
        defaultProps: { animation: "pulse" },
        styleOverrides: {
          root: {
            backgroundColor: "var(--pd-skeleton-bg)",
            borderRadius: 4,
            "&::after": {
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
            backgroundColor: "var(--pd-border-subtle)",
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
          root: { borderColor: "var(--pd-border-subtle)" },
        },
      },

      /* ── Breadcrumb / Typography misc ── */
      MuiTypography: {
        defaultProps: { variantMapping: { subtitle1: "p", subtitle2: "p" } },
      },
    },
  });
}

/* Default export — dark mode baseline; used as fallback. */
export const theme = createAppTheme("dark");
