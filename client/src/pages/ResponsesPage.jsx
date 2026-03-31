import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Alert, CircularProgress, Tooltip, IconButton,
  Link as MuiLink,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';

const ACTION_LABELS = {
  listing_removed: 'Listing removed',
  listing_edited:  'Listing edited',
  disputed:        'Disputed',
  no_action:       'No action taken',
};

function actionColor(a) {
  switch (a) {
    case 'listing_removed': return 'success';
    case 'listing_edited':  return 'info';
    case 'disputed':        return 'warning';
    case 'no_action':       return 'error';
    default: return 'default';
  }
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString();
}

// ─── Record Response Dialog ───────────────────────────────────────────────────

function RecordResponseDialog({ open, onClose, onSave, session, openViolations }) {
  const [violationId, setViolationId] = useState('');
  const [responseText, setResponseText] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setViolationId(''); setResponseText(''); setActionTaken(''); setError('');
  }

  async function handleSave() {
    if (!violationId) { setError('Select a violation notice'); return; }
    if (!responseText.trim()) { setError('Response text is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await apiFetch('/api/responses', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: violationId,
          response_text: responseText.trim(),
          action_taken: actionTaken || null,
        }),
      });
      if (!res.ok) { setError(await getApiErrorMessage(res, 'Failed to record response')); return; }
      onSave(await res.json());
      reset();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Record Seller Response</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl fullWidth required>
          <InputLabel>Violation notice</InputLabel>
          <Select value={violationId} label="Violation notice" onChange={(e) => setViolationId(e.target.value)}>
            {openViolations.length === 0 && (
              <MenuItem value="" disabled>No open violations available</MenuItem>
            )}
            {openViolations.map((v) => (
              <MenuItem key={v.violation_id} value={v.violation_id}>
                #{v.violation_id} — {v.recall_number} ({v.violation_status})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Seller response" required multiline rows={4} fullWidth
          value={responseText} onChange={(e) => setResponseText(e.target.value)}
          placeholder="Enter the seller's or marketplace's response to the violation notice..."
        />
        <FormControl fullWidth>
          <InputLabel>Action taken by seller</InputLabel>
          <Select value={actionTaken} label="Action taken by seller" onChange={(e) => setActionTaken(e.target.value)}>
            <MenuItem value="">(Not specified)</MenuItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Record response'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResponsesPage() {
  const { session } = useAuth();

  const [responses, setResponses] = useState([]);
  const [openViolations, setOpenViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [rRes, vRes] = await Promise.all([
          apiFetch('/api/responses', session),
          apiFetch('/api/violations', session),
        ]);
        if (!rRes.ok) throw new Error(await getApiErrorMessage(rRes, 'Failed to load responses'));
        if (!vRes.ok) throw new Error(await getApiErrorMessage(vRes, 'Failed to load violations'));
        const [rData, vData] = await Promise.all([rRes.json(), vRes.json()]);
        setResponses(rData);
        // Only show violations that have had a notice sent and aren't yet closed
        setOpenViolations(vData.filter((v) =>
          v.violation_status === 'Notice Sent' || v.violation_status === 'Open'
        ));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onResponseRecorded(row) {
    setResponses((prev) => [row, ...prev]);
    // Remove the violation from open list if it now has a response
    setOpenViolations((prev) => prev.filter((v) => v.violation_id !== row.violation_id));
  }

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Seller Responses</Typography>
          <Typography variant="body2" color="text.secondary">
            Record responses from sellers or marketplaces to violation notices.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Record response
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {openViolations.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {openViolations.length} violation notice{openViolations.length > 1 ? 's' : ''} awaiting a response.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell>Violation #</TableCell>
              <TableCell>Recall</TableCell>
              <TableCell>Listing</TableCell>
              <TableCell>Seller / Contact</TableCell>
              <TableCell>Response</TableCell>
              <TableCell>Action taken</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {responses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No responses recorded yet. Use "Record response" when a seller or marketplace replies to a violation notice.
                </TableCell>
              </TableRow>
            )}
            {responses.map((r) => (
              <TableRow key={r.response_id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>#{r.violation_id}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{r.recall_number}</Typography>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.recall_title}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 160 }}>
                  {r.listing_url ? (
                    <MuiLink href={r.listing_url} target="_blank" rel="noopener"
                      sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {r.listing_marketplace || 'View listing'}
                    </MuiLink>
                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{r.seller_name ?? '—'}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="body2"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {r.response_text}
                  </Typography>
                </TableCell>
                <TableCell>
                  {r.action_taken
                    ? <Chip label={ACTION_LABELS[r.action_taken] ?? r.action_taken} size="small" color={actionColor(r.action_taken)} />
                    : <Typography variant="caption" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{fmtDate(r.responded_at)}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <RecordResponseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={onResponseRecorded}
        session={session}
        openViolations={openViolations}
      />
    </Box>
  );
}
