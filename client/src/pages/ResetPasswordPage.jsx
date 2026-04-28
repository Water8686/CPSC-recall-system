import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import AuthShell from '../components/AuthShell';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), new_password: newPassword }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Reset failed');
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/login'), 2500);
  };

  return (
    <AuthShell subtitle="Choose a new password for your account.">
      <Card sx={{ maxWidth: 440, width: '100%', mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Set new password
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password updated. Redirecting to sign in…
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!success && (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                label="Reset token"
                fullWidth
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                margin="normal"
                helperText="Pasted from the forgot-password response or URL"
              />
              <TextField
                label="New password"
                type="password"
                fullWidth
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
              />
              <TextField
                label="Confirm new password"
                type="password"
                fullWidth
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Update password'}
              </Button>
            </Box>
          )}

          <Typography variant="body2" sx={{ mt: 2 }} align="center">
            <Link component={RouterLink} to="/login">
              Sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
