import { Box, Typography } from '@mui/material';
export default function OrdersPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" tabIndex={-1}>Orders</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Orders page — implemented in T9.
      </Typography>
    </Box>
  );
}
