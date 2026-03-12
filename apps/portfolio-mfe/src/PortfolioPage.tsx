import { Box, Typography } from '@mui/material';
export default function PortfolioPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" tabIndex={-1}>Portfolio</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Portfolio page — implemented in T8.
      </Typography>
    </Box>
  );
}
