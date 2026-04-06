import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { MARKETPLACES } from '../constants/violations';

export default function AddListingDialog({ open, onClose, recallId, onListingAdded }) {
  const { session } = useAuth();
  const [marketplace, setMarketplace] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [listedAt, setListedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function resetForm() {
    setMarketplace('');
    setUrl('');
    setTitle('');
    setDescription('');
    setSellerName('');
    setListedAt('');
    setError(null);
  }

  async function handleSubmit() {
    if (!url.trim()) {
      setError('Listing URL is required');
      return;
    }
    if (!marketplace) {
      setError('Please select a marketplace');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch('/api/listings', session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: recallId,
          url: url.trim(),
          marketplace,
          title: title.trim() || null,
          description: description.trim() || null,
          source: 'Manual',
          listed_at: listedAt || null,
        }),
      });
      if (!res.ok) {
        const msg = await getApiErrorMessage(res, 'Failed to add listing');
        setError(msg);
        return;
      }
      const data = await res.json();
      resetForm();
      onListingAdded?.(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Listing Manually</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Marketplace</InputLabel>
              <Select
                value={marketplace}
                label="Marketplace"
                onChange={(e) => setMarketplace(e.target.value)}
              >
                {MARKETPLACES.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Listing URL *"
              fullWidth
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.ebay.com/itm/..."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Listing Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Seller Name"
              fullWidth
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Date Listed"
              type="date"
              fullWidth
              value={listedAt}
              onChange={(e) => setListedAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Listing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
