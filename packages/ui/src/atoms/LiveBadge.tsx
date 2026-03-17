import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { SxProps } from '@mui/material';

export interface LiveBadgeProps {
  /** Extra sx applied to the wrapper Box. */
  sx?: SxProps;
}

/**
 * Pulsing LIVE indicator — green dot + "LIVE" label.
 * Shown when a market data stream is active and producing ticks.
 */
export function LiveBadge({ sx }: LiveBadgeProps = {}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ...sx,
      }}
    >
      <FiberManualRecordIcon
        sx={{
          fontSize: 7,
          color: 'success.main',
          animation: 'livePulse 2s ease-in-out infinite',
          '@keyframes livePulse': {
            '0%, 100%': { opacity: 1 },
            '50%':       { opacity: 0.4 },
          },
        }}
      />
      <Typography
        component="span"
        sx={{
          fontSize:      '0.625rem',
          fontWeight:    700,
          letterSpacing: '0.08em',
          color:         'success.main',
          lineHeight:    1,
        }}
      >
        LIVE
      </Typography>
    </Box>
  );
}
