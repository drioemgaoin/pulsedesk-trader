import { Box, Typography } from '@mui/material';
export default function SimulatorPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" tabIndex={-1}>Simulator</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Simulator page — implemented in T10.
      </Typography>
    </Box>
  );
}
