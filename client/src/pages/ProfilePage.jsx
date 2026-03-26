import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Grid,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import PageTitle from '../components/PageTitle';

export default function ProfilePage() {
  const { session, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSaving(true);
    const res = await apiFetch('/api/profile/me', session, {
      method: 'PATCH',
      body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl }),
    });
    setSaving(false);
    if (!res.ok) {
      setErr(await getApiErrorMessage(res, 'Failed to save'));
      return;
    }
    setMsg('Profile updated.');
    await refreshProfile();
  };

  const handleReset = () => {
    setFullName(profile?.full_name ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
    setMsg(null);
    setErr(null);
  };

  return (
    <Box>
      <PageTitle title="My profile" />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        My profile
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Update your display name and avatar image URL.
      </Typography>
      <Paper sx={{ p: 3, maxWidth: 560 }}>
        {msg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {msg}
          </Alert>
        )}
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Full name"
                fullWidth
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                inputProps={{ 'aria-label': 'Full name' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Avatar image URL"
                fullWidth
                placeholder="https://…"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                helperText="Public URL to an image (e.g. Supabase Storage)."
                inputProps={{ 'aria-label': 'Avatar image URL' }}
              />
            </Grid>
          </Grid>
          <Box display="flex" gap={2} mt={2}>
            <Button type="submit" variant="contained" disabled={saving}>
              Save
            </Button>
            <Button type="button" variant="outlined" onClick={handleReset}>
              Reset
            </Button>
            <Button type="button" variant="text" onClick={() => window.history.back()}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
