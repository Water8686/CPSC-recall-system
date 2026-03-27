import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [resetPath, setResetPath] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setResetPath(null);
    setLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Request failed');
      return;
    }

    setInfo(data.message || 'Check the instructions below.');
    if (data.resetPath) {
      setResetPath(data.resetPath);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
    >
      <Card sx={{ maxWidth: 440, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Forgot password
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Demo: no email is sent. After submitting, use the reset link shown below (or set{' '}
            <code>APP_EXPOSE_PASSWORD_RESET_LINK=false</code> on the server to hide the link in
            production).
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {info && !error && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {info}
            </Alert>
          )}
          {resetPath && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" component="span" display="block" gutterBottom>
                Open this link in the same browser:
              </Typography>
              <Link component={RouterLink} to={resetPath} fontWeight={600}>
                Go to reset password
              </Link>
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              autoFocus
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Send reset link'}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }} align="center">
            <Link component={RouterLink} to="/login">
              Back to sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
