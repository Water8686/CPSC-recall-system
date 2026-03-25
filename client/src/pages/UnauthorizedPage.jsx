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
      <Typography color="text.secondary" align="center" sx={{ maxWidth: 420 }}>
        You do not have permission to access this page. User and role management requires an
        account with <strong>admin</strong> in Supabase <code>profiles.user_type</code>. Ask a
        project owner to run the SQL update once, or use the Dashboard in Supabase to set your
        profile.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>
        Return to Dashboard
      </Button>
    </Box>
  );
}
