import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  Grid,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import PageTitle from '../components/PageTitle';
import {
  VIOLATION_PLATFORMS,
  VIOLATION_STATUSES,
  VIOLATION_SEVERITIES,
  USER_ROLES,
} from 'shared';
import { normalizeAppRole } from 'shared';

export default function ViolationFormPage() {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const [recalls, setRecalls] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [recallRef, setRecallRef] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [platform, setPlatform] = useState('Amazon');
  const [listingUrl, setListingUrl] = useState('');
  const [status, setStatus] = useState('Open');
  const [severity, setSeverity] = useState('Medium');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [rRes, aRes] = await Promise.all([
        apiFetch('/api/recalls', session),
        apiFetch('/api/admin/profiles', session),
      ]);
      if (cancelled) return;
      if (rRes.ok) {
        const data = await rRes.json();
        setRecalls(data);
      }
      if (aRes.ok) {
        const rows = await aRes.json();
        setSellers(rows.filter((p) => normalizeAppRole(p, null) === USER_ROLES.SELLER));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!recallRef || !sellerId || !listingUrl.trim()) {
      setError('Recall, seller, and listing URL are required.');
      return;
    }
    setSaving(true);
    const res = await apiFetch('/api/violations', session, {
      method: 'POST',
      body: JSON.stringify({
        recall_ref: recallRef,
        seller_id: sellerId,
        platform,
        listing_url: listingUrl.trim(),
        status,
        severity,
        investigator_id: user?.id,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Failed to create'));
      return;
    }
    navigate('/violations');
  };

  return (
    <Box>
      <PageTitle title="New violation" />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        New violation
      </Typography>
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, maxWidth: 720 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              options={recalls}
              getOptionLabel={(r) => `${r.recall_id} — ${r.title}`}
              onChange={(_, v) => setRecallRef(v ? v.id : '')}
              value={recalls.find((r) => r.id === recallRef) ?? null}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Recall"
                  required
                  placeholder="Search by recall"
                  inputProps={{ ...params.inputProps, 'aria-label': 'Recall' }}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel id="seller-label">Seller</InputLabel>
              <Select
                labelId="seller-label"
                label="Seller"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
              >
                {sellers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.full_name || s.email || s.username || s.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="plat-label">Platform</InputLabel>
              <Select
                labelId="plat-label"
                label="Platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {VIOLATION_PLATFORMS.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="sev-label">Severity</InputLabel>
              <Select
                labelId="sev-label"
                label="Severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {VIOLATION_SEVERITIES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Listing URL"
              required
              fullWidth
              value={listingUrl}
              onChange={(e) => setListingUrl(e.target.value)}
              inputProps={{ 'aria-label': 'Listing URL' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="st-label">Status</InputLabel>
              <Select
                labelId="st-label"
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {VIOLATION_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box display="flex" gap={2} mt={3}>
          <Button type="submit" variant="contained" disabled={saving}>
            Submit
          </Button>
          <Button type="button" variant="outlined" onClick={() => navigate('/violations')}>
            Cancel
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
