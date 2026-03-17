/** Base spacing unit in px — mirrors MUI theme `spacing` multiplier. */
export const SPACING_BASE: number;

export type BrandMode = "dark" | "light";

export interface BrandModeValues {
  bgCanvas: string;
  bgSurface: string;
  bgRaised: string;
  bgOverlay: string;

  divider: string;
  borderDefault: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textOnAccent: string;
  textOnStatus: string;

  accentPrimary: string;
  accentPrimaryDark: string;
  accentPrimaryLight: string;
  accentPrimaryMuted: string;
  accentPrimaryMutedStrong: string;

  accentSecondary: string;
  accentSecondaryDk: string;
  accentSecondaryLt: string;
  accentSecondaryMuted: string;
  accentOnSecondary: string;

  statusUp: string;
  statusUpLight: string;
  statusUpDark: string;
  statusUpMuted: string;

  statusDown: string;
  statusDownLight: string;
  statusDownDark: string;
  statusDownMuted: string;

  statusPending: string;
  statusPendingLight: string;
  statusPendingDark: string;
  statusPendingMuted: string;
  statusPendingMutedStrong: string;
  statusNeutral: string;

  actionHover: string;
  actionSelected: string;
  actionDisabledBg: string;
  focus: string;
  focusInsetRing: string;

  chipOutlinedHoverBg: string;
  chipOutlinedActiveBg: string;

  shadowElevation1: string;
  shadowElevation4: string;
  shadowTooltip: string;
  skeletonShimmer: string;

  appbarBorder: string;
  scrollbarThumb: string;
}

export interface BrandThemeSource {
  primitives: Record<string, string>;
  modes: Record<BrandMode, BrandModeValues>;
}

export const BRAND_THEME: BrandThemeSource;
