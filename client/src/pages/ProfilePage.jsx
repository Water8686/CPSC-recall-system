import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';

export default function ProfilePage() {
  const { session, profile, refreshProfile, isMockMode } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [profile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (isMockMode) return;
    setError(null);
    setMessage(null);
    setSaving(true);
    const res = await apiFetch('/api/auth/me', session, {
      method: 'PATCH',
      body: JSON.stringify({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Could not save profile'));
      return;
    }
    setMessage('Profile saved.');
    await refreshProfile();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (isMockMode) return;
    setError(null);
    setMessage(null);
    setPwSaving(true);
    const res = await apiFetch('/api/auth/change-password', session, {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    setPwSaving(false);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Could not change password'));
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setMessage('Password updated.');
  };

  if (isMockMode) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Profile
        </Typography>
        <Alert severity="info">Profile editing is disabled in mock mode.</Alert>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Profile
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Update your display name and profile picture URL. Passwords are stored as plain text in this
        class demo — do not reuse real passwords.
      </Typography>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Email: {profile.email}
        </Typography>
        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
          <Avatar
            src={avatarUrl.trim() || undefined}
            alt=""
            sx={{ width: 72, height: 72, bgcolor: 'primary.light' }}
          >
            {(fullName || profile.email || '?')[0].toUpperCase()}
          </Avatar>
          <Typography variant="caption" color="text.secondary">
            Preview updates when you save a valid image URL.
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSaveProfile} display="flex" flexDirection="column" gap={2} maxWidth={480}>
          <TextField
            label="Display name"
            fullWidth
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            label="Profile picture URL"
            fullWidth
            helperText="Paste an image URL (https://…)"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Save profile'}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change password
        </Typography>
        <Box component="form" onSubmit={handleChangePassword} display="flex" flexDirection="column" gap={2} maxWidth={480}>
          <TextField
            label="Current password"
            type="password"
            fullWidth
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            label="New password"
            type="password"
            fullWidth
            required
            helperText="At least 4 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button type="submit" variant="outlined" disabled={pwSaving}>
            {pwSaving ? <CircularProgress size={24} /> : 'Update password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
