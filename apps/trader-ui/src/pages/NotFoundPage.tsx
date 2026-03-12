import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page Not Found');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        p: 4,
        gap: 2,
      }}
      role="main"
      aria-label="Page not found"
    >
      <Typography variant="h5" component="h1">
        404 — Page Not Found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        The page you're looking for doesn't exist.
      </Typography>
      <Button component={Link} to="/trading" variant="outlined">
        Go to Terminal
      </Button>
    </Box>
  );
}
