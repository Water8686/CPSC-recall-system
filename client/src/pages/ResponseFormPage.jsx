import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import PageTitle from '../components/PageTitle';
import { RESPONSE_TYPES } from 'shared';

export default function ResponseFormPage() {
  const [searchParams] = useSearchParams();
  const violationIdFromQuery = searchParams.get('violationId') ?? '';
  const navigate = useNavigate();
  const { session } = useAuth();
  const [selectedViolationId, setSelectedViolationId] = useState(violationIdFromQuery);
  const [violations, setViolations] = useState([]);
  const [responseText, setResponseText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [responseType, setResponseType] = useState('Compliance');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    setSelectedViolationId(violationIdFromQuery);
  }, [violationIdFromQuery]);

  useEffect(() => {
    if (violationIdFromQuery) return;
    let cancelled = false;
    setLoadingList(true);
    (async () => {
      const res = await apiFetch('/api/violations', session);
      setLoadingList(false);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) setViolations(Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, violationIdFromQuery]);

  const effectiveViolationId = selectedViolationId || violationIdFromQuery;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!effectiveViolationId) return;
    setSaving(true);
    const res = await apiFetch('/api/violation-responses', session, {
      method: 'POST',
      body: JSON.stringify({
        violation_id: effectiveViolationId,
        response_text: responseText,
        evidence_url: evidenceUrl || null,
        response_type: responseType,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Failed to submit'));
      return;
    }
    navigate('/responses');
  };

  return (
    <Box>
      <PageTitle title="Submit response" />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Submit response
      </Typography>
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, maxWidth: 640 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {violationIdFromQuery ? (
          <TextField
            label="Violation ID"
            fullWidth
            value={violationIdFromQuery}
            disabled
            sx={{ mb: 2 }}
            inputProps={{ 'aria-label': 'Violation ID' }}
          />
        ) : (
          <>
            <FormControl fullWidth sx={{ mb: 2 }} required>
              <InputLabel id="viol-label">Violation</InputLabel>
              <Select
                labelId="viol-label"
                label="Violation"
                value={selectedViolationId}
                onChange={(e) => setSelectedViolationId(e.target.value)}
                disabled={loadingList}
              >
                {violations.map((v) => (
                  <MenuItem key={v.violation_id} value={String(v.violation_id)}>
                    {(v.recall_title || v.product_name || 'Violation') + ` — ${v.violation_id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!loadingList && violations.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No violations are assigned to your account yet. Contact an investigator if you expected
                one.
              </Alert>
            )}
          </>
        )}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="rt-label">Response type</InputLabel>
          <Select
            labelId="rt-label"
            label="Response type"
            value={responseType}
            onChange={(e) => setResponseType(e.target.value)}
          >
            {RESPONSE_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Response details"
          required
          fullWidth
          multiline
          minRows={4}
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          sx={{ mb: 2 }}
          inputProps={{ 'aria-label': 'Response details' }}
        />
        <TextField
          label="Evidence URL"
          fullWidth
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          sx={{ mb: 2 }}
          inputProps={{ 'aria-label': 'Evidence URL' }}
        />
        <Box display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={saving || !effectiveViolationId}>
            Submit
          </Button>
          <Button type="button" variant="text" onClick={() => navigate('/responses')}>
            Cancel
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
