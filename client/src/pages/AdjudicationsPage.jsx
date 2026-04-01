import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Alert, CircularProgress, Link as MuiLink,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';

const REASONS = {
  listing_removed:        'Listing removed',
  listing_edited:         'Listing edited',
  confirmed_different_model: 'Confirmed different model/batch',
  seller_unresponsive:    'Seller unresponsive',
  insufficient_evidence:  'Insufficient evidence',
  other:                  'Other',
};

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString();
}

// ─── Adjudicate Dialog ────────────────────────────────────────────────────────

function AdjudicateDialog({ open, onClose, onSave, session, readyViolations }) {
  const [violationId, setViolationId] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setViolationId(''); setStatus(''); setReason(''); setNotes(''); setError('');
  }

  async function handleSave() {
    if (!violationId) { setError('Select a violation'); return; }
    if (!status) { setError('Select a ruling (Resolved / Unresolved)'); return; }
    setSaving(true); setError('');
    try {
      const res = await apiFetch('/api/adjudications', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: violationId,
          status,
          reason: reason || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) { setError(await getApiErrorMessage(res, 'Failed to adjudicate')); return; }
      onSave(await res.json());
      reset();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const selectedViolation = readyViolations.find((v) => v.violation_id === violationId);

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GavelIcon /> Adjudicate Violation
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}

        <FormControl fullWidth required>
          <InputLabel>Violation notice</InputLabel>
          <Select value={violationId} label="Violation notice" onChange={(e) => setViolationId(e.target.value)}>
            {readyViolations.length === 0 && (
              <MenuItem value="" disabled>No violations ready for adjudication</MenuItem>
            )}
            {readyViolations.map((v) => (
              <MenuItem key={v.violation_id} value={v.violation_id}>
                #{v.violation_id} — {v.recall_number} — {v.violation_status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedViolation && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            <strong>{selectedViolation.recall_title}</strong>
            {selectedViolation.listing_url && (
              <> — <MuiLink href={selectedViolation.listing_url} target="_blank" rel="noopener">
                {selectedViolation.listing_marketplace || 'View listing'}
              </MuiLink></>
            )}
            <br />
            {selectedViolation.response_count > 0
              ? `${selectedViolation.response_count} seller response(s) on record.`
              : 'No seller response on record.'}
          </Alert>
        )}

        <FormControl fullWidth required>
          <InputLabel>Ruling</InputLabel>
          <Select value={status} label="Ruling" onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="Resolved">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" fontSize="small" /> Resolved
              </Box>
            </MenuItem>
            <MenuItem value="Unresolved">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CancelIcon color="error" fontSize="small" /> Unresolved
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Reason</InputLabel>
          <Select value={reason} label="Reason" onChange={(e) => setReason(e.target.value)}>
            <MenuItem value="">(Not specified)</MenuItem>
            {Object.entries(REASONS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Notes" multiline rows={3} fullWidth
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context about this adjudication decision..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button
          variant="contained"
          color={status === 'Resolved' ? 'success' : status === 'Unresolved' ? 'error' : 'primary'}
          onClick={handleSave}
          disabled={saving}
          startIcon={<GavelIcon />}
        >
          {saving ? <CircularProgress size={18} /> : 'Adjudicate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdjudicationsPage() {
  const { session } = useAuth();

  const [adjudications, setAdjudications] = useState([]);
  const [readyViolations, setReadyViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [aRes, vRes] = await Promise.all([
          apiFetch('/api/adjudications', session),
          apiFetch('/api/violations', session),
        ]);
        if (!aRes.ok) throw new Error(await getApiErrorMessage(aRes, 'Failed to load adjudications'));
        if (!vRes.ok) throw new Error(await getApiErrorMessage(vRes, 'Failed to load violations'));
        const [aData, vData] = await Promise.all([aRes.json(), vRes.json()]);

        // Already-adjudicated violation IDs
        const adjudicatedIds = new Set(aData.map((a) => a.violation_id));

        setAdjudications(aData);
        // Violations ready for adjudication: has a response OR notice was sent, and not yet adjudicated
        setReadyViolations(
          vData.filter((v) =>
            !adjudicatedIds.has(v.violation_id) &&
            (v.response_count > 0 || v.violation_status === 'Notice Sent' || v.violation_status === 'Response Received')
          )
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onAdjudicationCreated(row) {
    setAdjudications((prev) => [row, ...prev]);
    setReadyViolations((prev) => prev.filter((v) => v.violation_id !== row.violation_id));
  }

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const resolvedCount = adjudications.filter((a) => a.status === 'Resolved').length;
  const unresolvedCount = adjudications.filter((a) => a.status === 'Unresolved').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Adjudications</Typography>
          <Typography variant="body2" color="text.secondary">
            Final rulings on violations — resolved or unresolved with reason and notes.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<GavelIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={readyViolations.length === 0}
        >
          Adjudicate
        </Button>
      </Box>

      <div role="alert" aria-live="assertive">
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      </div>

      {readyViolations.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {readyViolations.length} violation{readyViolations.length > 1 ? 's' : ''} ready for adjudication.
          {' '}<Button size="small" onClick={() => setDialogOpen(true)}>Adjudicate now</Button>
        </Alert>
      )}

      {adjudications.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip icon={<CheckCircleIcon />} label={`${resolvedCount} Resolved`} color="success" />
          <Chip icon={<CancelIcon />} label={`${unresolvedCount} Unresolved`} color="error" />
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell scope="col">Violation #</TableCell>
              <TableCell scope="col">Recall</TableCell>
              <TableCell scope="col">Listing</TableCell>
              <TableCell scope="col">Investigator</TableCell>
              <TableCell scope="col">Seller action</TableCell>
              <TableCell scope="col">Ruling</TableCell>
              <TableCell scope="col">Reason</TableCell>
              <TableCell scope="col">Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {adjudications.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No adjudications yet. Once a seller responds (or is unresponsive), click "Adjudicate" to close the case.
                </TableCell>
              </TableRow>
            )}
            {adjudications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((a) => (
              <TableRow key={a.adjudication_id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>#{a.violation_id}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{a.recall_number}</Typography>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.recall_title}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 140 }}>
                  {a.listing_url ? (
                    <MuiLink href={a.listing_url} target="_blank" rel="noopener"
                      sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {a.listing_marketplace || 'View'}
                    </MuiLink>
                  ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{a.investigator_name ?? '—'}</Typography>
                </TableCell>
                <TableCell>
                  {a.latest_action
                    ? <Chip label={REASONS[a.latest_action] ?? a.latest_action} size="small" variant="outlined" />
                    : <Typography variant="caption" color="text.secondary">None on record</Typography>}
                </TableCell>
                <TableCell>
                  <Chip
                    label={a.status}
                    size="small"
                    color={a.status === 'Resolved' ? 'success' : 'error'}
                    icon={a.status === 'Resolved' ? <CheckCircleIcon /> : <CancelIcon />}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {a.reason ? (REASONS[a.reason] ?? a.reason) : '—'}
                  </Typography>
                  {a.notes && (
                    <Typography variant="caption" display="block" color="text.secondary"
                      sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.notes}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{fmtDate(a.adjudicated_at)}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {adjudications.length > 0 && (
          <TablePagination
            component="div"
            count={adjudications.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        )}
      </TableContainer>

      <AdjudicateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={onAdjudicationCreated}
        session={session}
        readyViolations={readyViolations}
      />
    </Box>
  );
}
