import { useState } from 'react';
import { Alert, Box, Button, Paper, Snackbar, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';

export default function SellerResponsesPage() {
  const { session } = useAuth();
  const [violationId, setViolationId] = useState('');
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [rows, setRows] = useState([]);

  async function submitResponse() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/responses', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: violationId,
          response_text: responseText,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setResponseText('');
      setSnackbar('Response saved successfully');
      await loadResponses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadResponses() {
    setError(null);
    try {
      const query = violationId ? `?violation_id=${encodeURIComponent(violationId)}` : '';
      const res = await apiFetch(`/api/responses${query}`, session);
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setRows(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Respond to Violation
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
        <TextField
          label="Seller Response Text"
          fullWidth
          multiline
          minRows={4}
          required
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={submitResponse}
            disabled={saving || !String(violationId).trim() || !String(responseText).trim()}
          >
            {saving ? 'Submitting...' : 'Submit Response'}
          </Button>
          <Button variant="outlined" onClick={loadResponses}>
            View My Responses
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          My Submitted Responses
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No responses found for the selected filter.
          </Typography>
        ) : (
          rows.map((row) => (
            <Box key={row.response_id} sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" fontWeight={600}>
                Violation #{row.violation_id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Submitted: {row.responded_at ? new Date(row.responded_at).toLocaleString() : '—'}
              </Typography>
              <Typography variant="body2">{row.response_text}</Typography>
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
