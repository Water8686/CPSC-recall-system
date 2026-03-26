import { Box, Typography, Button, Paper } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageTitle from '../components/PageTitle';

export default function PendingApprovalPage() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
      px={2}
    >
      <PageTitle title="Pending approval" />
      <Paper sx={{ p: 4, maxWidth: 480 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Account pending approval
        </Typography>
        <Typography color="text.secondary" paragraph>
          Your account ({profile?.email ?? '—'}) is waiting for a CPSC manager or administrator to
          approve access. You will be able to use the system once approved.
        </Typography>
        <Button variant="outlined" startIcon={<LogoutIcon />} onClick={handleSignOut}>
          Sign out
        </Button>
      </Paper>
    </Box>
  );
}
