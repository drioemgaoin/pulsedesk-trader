import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material';

export interface PulsingChipProps {
  label: string;
  color?: ChipProps['color'];
  /** Pulse animation speed in ms. Defaults to 1500. */
  durationMs?: number;
}

/**
 * Animated status chip with a CSS pulse animation.
 * Used for transient states: RECONNECTING, STALE, LOADING, etc.
 */
export function PulsingChip({
  label,
  color = 'warning',
  durationMs = 1500,
}: PulsingChipProps) {
  return (
    <Chip
      label={label}
      size="small"
      color={color}
      sx={{
        fontSize:      '0.625rem',
        height:        18,
        fontWeight:    700,
        letterSpacing: '0.04em',
        animation:     `chipPulse ${durationMs}ms ease-in-out infinite`,
        '@keyframes chipPulse': {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.4 },
        },
      }}
    />
  );
}
