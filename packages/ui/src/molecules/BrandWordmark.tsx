import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SxProps } from '@mui/material';

const SIZE_MAP = {
  sm: {
    brandFontSize:   '0.9375rem',
    tagFontSize:     '0.625rem',
    brandTracking:   '-0.01em',
    tagTracking:     '0.12em',
    tagMl:           0.5,
  },
  lg: {
    brandFontSize:   '1.375rem',
    tagFontSize:     '0.6875rem',
    brandTracking:   '-0.02em',
    tagTracking:     '0.14em',
    tagMl:           0.75,
  },
} as const;

export type BrandWordmarkSize = keyof typeof SIZE_MAP;

export interface BrandWordmarkProps {
  /**
   * Visual size of the wordmark.
   * `sm` — compact nav bar size (15px brand / 10px tag).
   * `lg` — hero / login page size (22px brand / 11px tag).
   */
  size?: BrandWordmarkSize;
  /** Extra sx applied to the outer Box. */
  sx?: SxProps;
}

/**
 * PulseDesk TRADER wordmark.
 *
 * Single source of truth for the brand name typography.
 * Use `size="sm"` in the nav bar and `size="lg"` on the login hero.
 *
 * @example
 *   <BrandWordmark size="sm" />   // nav bar
 *   <BrandWordmark size="lg" />   // login page / hero
 */
export function BrandWordmark({ size = 'sm', sx }: BrandWordmarkProps) {
  const s = SIZE_MAP[size];
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5, ...sx }}
    >
      <Typography
        component="span"
        sx={{
          fontSize:      s.brandFontSize,
          fontWeight:    400,
          letterSpacing: s.brandTracking,
          color:         'text.primary',
          lineHeight:    1,
        }}
      >
        Pulse
      </Typography>
      <Typography
        component="span"
        sx={{
          fontSize:      s.brandFontSize,
          fontWeight:    700,
          letterSpacing: s.brandTracking,
          color:         'primary.main',
          lineHeight:    1,
        }}
      >
        Desk
      </Typography>
      <Typography
        component="span"
        sx={{
          fontSize:      s.tagFontSize,
          fontWeight:    600,
          letterSpacing: s.tagTracking,
          color:         'text.secondary',
          ml:            s.tagMl,
          lineHeight:    1,
        }}
      >
        TRADER
      </Typography>
    </Box>
  );
}
