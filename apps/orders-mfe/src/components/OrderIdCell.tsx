import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  ContentCopyIcon,
} from '@pulsedesk/ui';

export interface OrderIdCellProps {
  id: string;
}

/** Truncated order ID with a one-click copy-to-clipboard button. */
export function OrderIdCell({ id }: OrderIdCellProps) {
  const short = id.slice(0, 8) + '…';
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Tooltip title={id}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {short}
        </Typography>
      </Tooltip>
      <Tooltip title="Copy">
        <Box
          component="span"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); void navigator.clipboard.writeText(id); }}
        >
          <IconButton
            size="small"
            aria-label={`copy order id ${id}`}
            tabIndex={-1}
          >
            <ContentCopyIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>
      </Tooltip>
    </Stack>
  );
}
