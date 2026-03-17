import { Box, Stack, Typography } from '@pulsedesk/ui';
import { pd } from '@pulsedesk/ui';
import type { OrderResponseV1 } from '../api/types';

export interface RowDetailProps {
  order: OrderResponseV1;
}

export function RowDetail({ order }: RowDetailProps) {
  if (!order) return null;
  return (
    <Box
      sx={{
        px: 4,
        py: 2,
        bgcolor: pd.bgCanvas,
        borderLeft: '3px solid',
        borderLeftColor: 'divider',
      }}
    >
      <Stack direction="row" flexWrap="wrap" gap={3}>
        <Box>
          <Typography variant="caption" color="text.secondary">Order ID</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{order.id}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Command ID</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{order.commandId}</Typography>
        </Box>
        {order.limitPrice != null && (
          <Box>
            <Typography variant="caption" color="text.secondary">Limit Price</Typography>
            <Typography variant="body2">${order.limitPrice.toFixed(2)}</Typography>
          </Box>
        )}
        {order.rejectionReason && (
          <Box>
            <Typography variant="caption" color="text.secondary">Rejection Reason</Typography>
            <Typography variant="body2" color="error.main">{order.rejectionReason}</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
