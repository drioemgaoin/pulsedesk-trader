/**
 * Single source of truth for brand/theme colors used by:
 * - src/theme.ts (MUI palette + component overrides)
 * - src/tokens.css (generated via scripts/generate-tokens-css.mjs)
 *
 * Edit values here, then run:
 *   pnpm -C packages/ui tokens:generate
 */
export const BRAND_THEME = {
  primitives: {
    "navy-950": "#070B14",
    "navy-900": "#0D1321",
    "navy-800": "#162033",
    "navy-700": "#1E2D45",
    "navy-600": "#2A3D58",
    "navy-500": "#3A4F6A",
    "navy-400": "#4A6080",
    "navy-300": "#6A84A0",
    "navy-200": "#8A9BB5",
    "navy-100": "#B4C0D0",

    "parchment-50": "#FAFAF7",
    "parchment-100": "#F4F1EB",
    "parchment-200": "#EDE9E0",
    "parchment-300": "#DDD8CC",
    "parchment-400": "#C8C0AE",
    "parchment-500": "#ADA490",

    "amber-300": "#FCD34D",
    "amber-400": "#FBBF24",
    "amber-500": "#F59E0B",
    "amber-600": "#D97706",
    "amber-700": "#B45309",
    "amber-800": "#92400E",
    "amber-900": "#78350F",

    "blue-300": "#7AB4E8",
    "blue-400": "#5FA0DE",
    "blue-500": "#4A90D9",
    "blue-600": "#3578C4",
    "blue-700": "#2B5EA7",
    "blue-800": "#1E4A87",

    "green-400": "#52C27D",
    "green-500": "#3DAA6A",
    "green-600": "#2A8F55",
    "green-700": "#1A7A42",

    "red-400": "#E87870",
    "red-500": "#D95E52",
    "red-600": "#C04840",
    "red-700": "#A83530",

    "pending-400": "#F0B060",
    "pending-500": "#E0963A",
    "pending-600": "#C07020",
    "pending-700": "#9A5818",
    "cyan-600": "#0891B2",
    "slate-600": "#475569",

    white: "#FFFFFF",
    black: "#000000",
  },

  modes: {
    dark: {
      bgCanvas: "#070B14",
      bgSurface: "#0D1321",
      bgRaised: "#162033",
      bgOverlay: "#0D1321",

      divider: "#1E2D45",
      borderDefault: "#2A3D58",
      borderStrong: "#3A4F6A",

      textPrimary: "#E8EDF5",
      textSecondary: "#8A9BB5",
      textMuted: "#4A6080",
      textDisabled: "#3A4F6A",
      textOnAccent: "#070B14",
      textOnStatus: "#FFFFFF",

      accentPrimary: "#F59E0B",
      accentPrimaryDark: "#D97706",
      accentPrimaryLight: "#FBBF24",
      accentPrimaryMuted: "rgba(245,158,11,0.12)",
      accentPrimaryMutedStrong: "rgba(245,158,11,0.22)",

      accentSecondary: "#4A90D9",
      accentSecondaryDk: "#3578C4",
      accentSecondaryLt: "#5FA0DE",
      accentSecondaryMuted: "rgba(74,144,217,0.12)",
      accentOnSecondary: "#070B14",

      statusUp: "#3DAA6A",
      statusUpLight: "#52C27D",
      statusUpDark: "#2A8F55",
      statusUpMuted: "rgba(61,170,106,0.12)",

      statusDown: "#D95E52",
      statusDownLight: "#E87870",
      statusDownDark: "#C04840",
      statusDownMuted: "rgba(217,94,82,0.12)",

      statusPending: "#E0963A",
      statusPendingLight: "#F0B060",
      statusPendingDark: "#C07020",
      statusPendingMuted: "rgba(224,150,58,0.08)",
      statusPendingMutedStrong: "rgba(224,150,58,0.16)",
      statusNeutral: "#4A6080",
      statusCancelled: '#475569',
      statusPartial:   '#0891B2',
      tableZebraBg:    'rgba(255,255,255,0.022)',
      tableHoverBg:    'rgba(255,255,255,0.055)',

      actionHover: "rgba(255,255,255,0.04)",
      actionSelected: "rgba(245,158,11,0.10)",
      actionDisabledBg: "rgba(255,255,255,0.06)",
      focus: "rgba(245,158,11,0.28)",
      focusInsetRing: "inset 0 0 0 2px rgba(255,255,255,0.80)",

      chipOutlinedHoverBg: "rgba(255,255,255,0.10)",
      chipOutlinedActiveBg: "rgba(255,255,255,0.18)",

      shadowElevation1: "0 2px 8px rgba(0,0,0,0.40)",
      shadowElevation4: "0 4px 20px rgba(0,0,0,0.50)",
      shadowTooltip: "0 4px 12px rgba(0,0,0,0.40)",
      skeletonShimmer:
        "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)",

      appbarBorder: "rgba(245,158,11,0.14)",
      scrollbarThumb: "#1E2D45",
    },

    light: {
      bgCanvas: "#F4F1EB",
      bgSurface: "#FAFAF7",
      bgRaised: "#FFFFFF",
      bgOverlay: "#FFFFFF",

      divider: "#DDD8CC",
      borderDefault: "#C8C0AE",
      borderStrong: "#ADA490",

      textPrimary: "#0E1520",
      textSecondary: "#4A5A72",
      textMuted: "#9BA8BC",
      textDisabled: "#9BA8BC",
      textOnAccent: "#FFFFFF",
      textOnStatus: "#FFFFFF",

      accentPrimary: "#B45309",
      accentPrimaryDark: "#92400E",
      accentPrimaryLight: "#D97706",
      accentPrimaryMuted: "rgba(180,83,9,0.09)",
      accentPrimaryMutedStrong: "rgba(180,83,9,0.17)",

      accentSecondary: "#2B5EA7",
      accentSecondaryDk: "#1E4A87",
      accentSecondaryLt: "#3578C4",
      accentSecondaryMuted: "rgba(43,94,167,0.08)",
      accentOnSecondary: "#FFFFFF",

      statusUp: "#1A7A42",
      statusUpLight: "#2A8F55",
      statusUpDark: "#126030",
      statusUpMuted: "rgba(26,122,66,0.10)",

      statusDown: "#A83530",
      statusDownLight: "#C04840",
      statusDownDark: "#862A25",
      statusDownMuted: "rgba(168,53,48,0.10)",

      statusPending: "#C07020",
      statusPendingLight: "#D98030",
      statusPendingDark: "#9A5818",
      statusPendingMuted: "rgba(192,112,32,0.08)",
      statusPendingMutedStrong: "rgba(192,112,32,0.16)",
      statusNeutral: "#4A6080",
      statusCancelled: '#475569',
      statusPartial:   '#0891B2',
      tableZebraBg:    'rgba(0,0,0,0.028)',
      tableHoverBg:    'rgba(0,0,0,0.055)',

      actionHover: "rgba(0,0,0,0.04)",
      actionSelected: "rgba(180,83,9,0.09)",
      actionDisabledBg: "rgba(0,0,0,0.05)",
      focus: "rgba(180,83,9,0.24)",
      focusInsetRing: "inset 0 0 0 2px rgba(255,255,255,0.80)",

      chipOutlinedHoverBg: "rgba(0,0,0,0.08)",
      chipOutlinedActiveBg: "rgba(0,0,0,0.14)",

      shadowElevation1: "0 2px 8px rgba(0,0,0,0.12)",
      shadowElevation4: "0 4px 20px rgba(0,0,0,0.16)",
      shadowTooltip: "0 4px 12px rgba(0,0,0,0.12)",
      skeletonShimmer:
        "linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent)",

      appbarBorder: "rgba(180,83,9,0.14)",
      scrollbarThumb: "#C8C0AE",
    },
  },
};
