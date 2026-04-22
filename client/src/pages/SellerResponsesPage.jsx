import { useCallback, useEffect, useState } from 'react';
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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';

export default function SellerResponsesPage() {
  const { session } = useAuth();
  const [violations, setViolations] = useState([]);
  const [violationId, setViolationId] = useState('');
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [responses, setResponses] = useState([]);

  const loadResponses = useCallback(
    async (signal) => {
      try {
        const res = await apiFetch('/api/responses', session, { signal });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const rows = await res.json();
        if (!signal?.aborted) setResponses(rows);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message);
      }
    },
    [session],
  );

  const loadViolations = useCallback(
    async (signal) => {
      try {
        const res = await apiFetch('/api/violations', session, { signal });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const rows = await res.json();
        if (signal?.aborted) return;
        setViolations(rows);
        setViolationId((prev) => prev || String(rows[0]?.violation_id ?? ''));
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message);
      }
    },
    [session],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([loadViolations(controller.signal), loadResponses(controller.signal)]).finally(
      () => {
        if (!controller.signal.aborted) setLoading(false);
      },
    );
    return () => controller.abort();
  }, [loadViolations, loadResponses]);

  async function submitResponse() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/responses', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: Number(violationId),
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

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Respond to a Violation
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        {violations.length === 0 && !loading ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No violations have been filed against your account.
          </Alert>
        ) : (
          <FormControl fullWidth sx={{ mb: 2 }} disabled={loading || violations.length === 0}>
            <InputLabel id="seller-violation-select-label">Violation</InputLabel>
            <Select
              labelId="seller-violation-select-label"
              label="Violation"
              value={violationId}
              onChange={(e) => setViolationId(e.target.value)}
            >
              {violations.map((v) => (
                <MenuItem key={v.violation_id} value={String(v.violation_id)}>
                  #{v.violation_id} — {v.recall_title ?? v.recall_number ?? 'Violation'} (
                  {v.violation_status})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          label="Your Response"
          fullWidth
          multiline
          minRows={4}
          required
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            onClick={submitResponse}
            disabled={
              saving ||
              loading ||
              !String(violationId).trim() ||
              !String(responseText).trim() ||
              violations.length === 0
            }
          >
            {saving ? 'Submitting…' : 'Submit Response'}
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          My Submitted Responses
        </Typography>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading…
          </Typography>
        ) : responses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            You have not submitted any responses yet.
          </Typography>
        ) : (
          responses.map((row) => (
            <Box
              key={row.response_id}
              sx={{
                mb: 1.5,
                pb: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                Violation #{row.violation_id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Submitted:{' '}
                {row.responded_at ? new Date(row.responded_at).toLocaleString() : '—'}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {row.response_text}
              </Typography>
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
