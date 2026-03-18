import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={2}
    >
      <Typography variant="h5" fontWeight={700}>
        Access Denied
      </Typography>
      <Typography color="text.secondary">
        You do not have permission to access this page.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>
        Return to Dashboard
      </Button>
    </Box>
  );
}
