import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';

const ADJ_STATUSES = ['Approved', 'Rejected', 'Escalated'];

export default function InvestigatorAdjudicationsPage() {
  const { session } = useAuth();
  const [violationId, setViolationId] = useState('');
  const [status, setStatus] = useState('Approved');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [rows, setRows] = useState([]);

  async function submitAdjudication() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/adjudications', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: violationId,
          status,
          notes,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setNotes('');
      setSnackbar('Adjudication saved successfully');
      await loadAdjudications();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadAdjudications() {
    setError(null);
    try {
      const query = violationId ? `?violation_id=${encodeURIComponent(violationId)}` : '';
      const res = await apiFetch(`/api/adjudications${query}`, session);
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setRows(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Adjudicate Violation
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField
          label="Violation ID"
          fullWidth
          required
          value={violationId}
          onChange={(e) => setViolationId(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Adjudication Status</InputLabel>
          <Select
            label="Adjudication Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {ADJ_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Notes"
          fullWidth
          multiline
          minRows={3}
          required
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={submitAdjudication}
            disabled={saving || !String(violationId).trim() || !String(notes).trim()}
          >
            {saving ? 'Submitting...' : 'Submit Adjudication'}
          </Button>
          <Button variant="outlined" onClick={loadAdjudications}>
            Search by Violation ID
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Adjudication Results
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No adjudications found for the selected filter.
          </Typography>
        ) : (
          rows.map((row) => (
            <Box
              key={row.adjudication_id}
              sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Typography variant="body2" fontWeight={600}>
                Violation #{row.violation_id} - {row.status}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Decision Date: {row.adjudicated_at ? new Date(row.adjudicated_at).toLocaleString() : '—'}
              </Typography>
              <Typography variant="body2">{row.notes || '—'}</Typography>
            </Box>
          ))
        )}
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3500}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
