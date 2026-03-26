import { useState, useEffect } from 'react';
import { useNavigate, useParams, useMatch } from 'react-router-dom';
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
  Grid,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import PageTitle from '../components/PageTitle';
import { RECALL_STATUSES } from 'shared';

export default function RecallFormPage() {
  const { id } = useParams();
  const isNewRoute = useMatch({ path: '/recalls/new', end: true });
  const isNew = Boolean(isNewRoute);
  const navigate = useNavigate();
  const { session } = useAuth();

  const [form, setForm] = useState({
    recall_number: '',
    recall_title: '',
    product_name: '',
    product_type: '',
    hazard: '',
    recall_date: '',
    description: '',
    remedy: '',
    status: 'Active',
    image_url: '',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isNew) {
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await apiFetch(`/api/recalls/${encodeURIComponent(id)}`, session);
      setLoading(false);
      if (!res.ok) {
        setError(await getApiErrorMessage(res, 'Failed to load'));
        return;
      }
      const r = await res.json();
      if (cancelled) return;
      setForm({
        recall_number: r.recall_id ?? '',
        recall_title: r.title ?? '',
        product_name: r.product ?? '',
        product_type: r.product_type ?? '',
        hazard: r.hazard ?? '',
        recall_date: r.created_at ? String(r.created_at).slice(0, 10) : '',
        description: r.description ?? '',
        remedy: r.remedy ?? '',
        status: r.status ?? 'Active',
        image_url: r.image_url ?? '',
      });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, session]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const body = {
      recall_number: form.recall_number,
      recall_title: form.recall_title,
      product_name: form.product_name,
      product_type: form.product_type,
      hazard: form.hazard,
      recall_date: form.recall_date || null,
      description: form.description,
      remedy: form.remedy,
      status: form.status,
      image_url: form.image_url || null,
    };
    const url = isNew ? '/api/recalls' : `/api/recalls/${encodeURIComponent(id)}`;
    const method = isNew ? 'POST' : 'PATCH';
    const res = await apiFetch(url, session, { method, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Save failed'));
      return;
    }
    navigate('/recalls');
  };

  if (loading) {
    return (
      <Box>
        <PageTitle title={isNew ? 'New recall' : 'Edit recall'} />
        <Typography>Loading…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle title={isNew ? 'New recall' : 'Edit recall'} />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {isNew ? 'New recall' : 'Edit recall'}
      </Typography>
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, maxWidth: 720 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Recall number"
              required
              fullWidth
              value={form.recall_number}
              onChange={setField('recall_number')}
              disabled={!isNew}
              inputProps={{ 'aria-label': 'Recall number' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                label="Status"
                value={form.status}
                onChange={setField('status')}
              >
                {RECALL_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Title"
              required
              fullWidth
              value={form.recall_title}
              onChange={setField('recall_title')}
              inputProps={{ 'aria-label': 'Recall title' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Product name"
              fullWidth
              value={form.product_name}
              onChange={setField('product_name')}
              inputProps={{ 'aria-label': 'Product name' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Product type"
              fullWidth
              value={form.product_type}
              onChange={setField('product_type')}
              inputProps={{ 'aria-label': 'Product type' }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Hazard"
              fullWidth
              multiline
              minRows={2}
              value={form.hazard}
              onChange={setField('hazard')}
              inputProps={{ 'aria-label': 'Hazard description' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Recall date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.recall_date}
              onChange={setField('recall_date')}
              inputProps={{ 'aria-label': 'Recall date' }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Image URL"
              fullWidth
              value={form.image_url}
              onChange={setField('image_url')}
              inputProps={{ 'aria-label': 'Product image URL' }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              value={form.description}
              onChange={setField('description')}
              inputProps={{ 'aria-label': 'Description' }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Remedy"
              fullWidth
              multiline
              minRows={2}
              value={form.remedy}
              onChange={setField('remedy')}
              inputProps={{ 'aria-label': 'Remedy' }}
            />
          </Grid>
        </Grid>
        <Box display="flex" gap={2} mt={3}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Submit'}
          </Button>
          <Button type="button" variant="outlined" onClick={() => setForm({ ...form })}>
            Reset
          </Button>
          <Button type="button" variant="text" onClick={() => navigate('/recalls')}>
            Cancel
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
