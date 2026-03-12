// T5 scaffold — full implementation delivered in T6.
// Existing panels from apps/trader-ui/src/features/ will be migrated here.
import { Box, Typography } from '@mui/material';

export default function TradingTerminalPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" tabIndex={-1}>
        Terminal
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Trading terminal panels — implemented in T6.
      </Typography>
    </Box>
  );
}
