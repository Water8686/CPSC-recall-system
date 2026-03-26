import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import PageTitle from '../components/PageTitle';
import { ALL_PROFILE_ROLES } from 'shared';

const ROLE_LABELS = {
  manager: 'CPSC Manager',
  investigator: 'Investigator',
  seller: 'Seller',
};

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [requestedRole, setRequestedRole] = useState('seller');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { data, error: err } = await signUp({
      email,
      password,
      fullName,
      requestedRole,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.session) {
      navigate('/pending-approval');
      return;
    }
    setInfo(
      'Check your email to confirm your account if required. After signing in, a manager must approve access.',
    );
    navigate('/login');
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
    >
      <PageTitle title="Sign up" />
      <Card sx={{ maxWidth: 440, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Create account
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Request access to the CPSC Recall Monitor. A manager must approve your account.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {info && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {info}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Full name"
              fullWidth
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              margin="normal"
              autoComplete="name"
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              autoComplete="new-password"
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="role-label">Requested role</InputLabel>
              <Select
                labelId="role-label"
                label="Requested role"
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value)}
              >
                {ALL_PROFILE_ROLES.filter((r) => r !== 'admin').map((r) => (
                  <MenuItem key={r} value={r}>
                    {ROLE_LABELS[r] ?? r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? 'Creating…' : 'Sign up'}
            </Button>
            <Typography variant="body2" sx={{ mt: 2 }} textAlign="center">
              <RouterLink to="/login">Back to sign in</RouterLink>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
