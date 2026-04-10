import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Divider,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { statusColor } from '../constants/violations';

const RESPONSE_ACTIONS = [
  { value: 'listing_removed', label: 'Listing removed' },
  { value: 'listing_edited', label: 'Listing edited' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'no_action', label: 'No action' },
];

const ADJ_STATUSES = [
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Unresolved', label: 'Unresolved' },
];

const ADJ_REASONS = [
  { value: 'listing_removed', label: 'Listing removed' },
  { value: 'listing_edited', label: 'Listing edited' },
  { value: 'confirmed_different_model', label: 'Confirmed different model' },
  { value: 'seller_unresponsive', label: 'Seller unresponsive' },
  { value: 'insufficient_evidence', label: 'Insufficient evidence' },
  { value: 'other', label: 'Other' },
];

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : String(value);
}

export default function ViolationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [violation, setViolation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const [contactSummary, setContactSummary] = useState('');
  const [contactChannel, setContactChannel] = useState('');
  const [markNoticeSent, setMarkNoticeSent] = useState(true);
  const [contactSaving, setContactSaving] = useState(false);

  const [responseText, setResponseText] = useState('');
  const [responseAction, setResponseAction] = useState('no_action');
  const [responseSaving, setResponseSaving] = useState(false);

  const [adjStatus, setAdjStatus] = useState('Resolved');
  const [adjReason, setAdjReason] = useState('listing_removed');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  const [noResponseDialogOpen, setNoResponseDialogOpen] = useState(false);
  const [noResponseSaving, setNoResponseSaving] = useState(false);

  const sellerResponseSectionRef = useRef(null);

  const loadViolation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/violations/${id}`, session);
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const data = await res.json();
      setViolation(data);
      setNotesDraft(data.notes ?? '');
    } catch (err) {
      setError(err.message);
      setViolation(null);
    } finally {
      setLoading(false);
    }
  }, [id, session]);

  useEffect(() => {
    loadViolation();
  }, [loadViolation]);

  async function saveNotes() {
    if (!violation) return;
    setNotesSaving(true);
    try {
      const res = await apiFetch(`/api/violations/${violation.violation_id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notesDraft.trim() || null }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const updated = await res.json();
      setViolation((prev) => (prev ? { ...prev, notes: updated.notes } : prev));
      setSnackbar('Notes saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setNotesSaving(false);
    }
  }

  async function submitContact() {
    if (!violation || !contactSummary.trim()) return;
    setContactSaving(true);
    try {
      const res = await apiFetch('/api/contacts', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: violation.violation_id,
          message_summary: contactSummary.trim(),
          contact_channel: contactChannel.trim() || undefined,
          mark_notice_sent: markNoticeSent,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setContactSummary('');
      setContactChannel('');
      setSnackbar(markNoticeSent ? 'Contact logged and notice marked sent' : 'Contact logged');
      await loadViolation();
    } catch (err) {
      setError(err.message);
    } finally {
      setContactSaving(false);
    }
  }

  async function submitResponse() {
    if (!violation || !responseText.trim()) return;
    setResponseSaving(true);
    try {
      const res = await apiFetch('/api/responses', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: violation.violation_id,
          response_text: responseText.trim(),
          action_taken: responseAction,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setResponseText('');
      setResponseAction('no_action');
      setSnackbar('Response recorded');
      await loadViolation();
    } catch (err) {
      setError(err.message);
    } finally {
      setResponseSaving(false);
    }
  }

  function scrollToSellerResponse() {
    sellerResponseSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submitNoSellerResponse() {
    if (!violation) return;
    setNoResponseSaving(true);
    try {
      const recordedAt = new Date().toISOString();
      const text = `No response received from seller as of ${recordedAt}. Recorded by investigator.`;
      const res = await apiFetch('/api/responses', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: violation.violation_id,
          response_text: text,
          action_taken: 'no_action',
          responder_type: 'investigator',
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setNoResponseDialogOpen(false);
      setSnackbar('No-response record saved; you can submit a final decision when ready');
      await loadViolation();
    } catch (err) {
      setError(err.message);
    } finally {
      setNoResponseSaving(false);
    }
  }

  async function submitAdjudication() {
    if (!violation) return;
    setAdjSaving(true);
    try {
      const res = await apiFetch('/api/adjudications', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: violation.violation_id,
          status: adjStatus,
          reason: adjReason,
          notes: adjNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setAdjNotes('');
      setSnackbar('Final decision recorded; violation closed');
      await loadViolation();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdjSaving(false);
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !violation) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/violations')} sx={{ mb: 2 }}>
          Back to violations
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!violation) return null;

  const recallPath =
    violation.recall_number != null && String(violation.recall_number).trim()
      ? `/recalls/${encodeURIComponent(String(violation.recall_number).trim())}`
      : null;

  const canAdjudicate =
    violation.response_count > 0 &&
    !violation.adjudication &&
    violation.violation_status !== 'Closed';

  const noticeComplete = Boolean(violation.notice_sent_at);
  const responseComplete = violation.response_count > 0;
  const decisionComplete = Boolean(violation.adjudication) || violation.violation_status === 'Closed';
  let activeWorkflowStep = 0;
  if (!noticeComplete) activeWorkflowStep = 0;
  else if (!responseComplete) activeWorkflowStep = 1;
  else if (!decisionComplete) activeWorkflowStep = 2;
  else activeWorkflowStep = 3;

  const canRecordNoSellerResponse =
    !responseComplete &&
    violation.violation_status !== 'Closed' &&
    !violation.adjudication;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/violations')} sx={{ mb: 2 }}>
        Back to violations
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Violation #{violation.violation_id}
          </Typography>
          <Chip
            label={violation.violation_status}
            color={statusColor(violation.violation_status)}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {violation.violation_type || '—'} · Noticed {fmtDate(violation.violation_noticed_at)} ·
          Violation date {fmtDate(violation.date_of_violation)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          <strong>Listing:</strong>{' '}
          {violation.listing_url ? (
            <a href={violation.listing_url} target="_blank" rel="noreferrer">
              {violation.listing_title || violation.listing_url}
            </a>
          ) : (
            violation.listing_title || '—'
          )}
          {violation.listing_marketplace && ` · ${violation.listing_marketplace}`}
        </Typography>
        {(violation.seller_name || violation.seller_email) && (
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Seller:</strong> {violation.seller_name || '—'}
            {violation.seller_email && ` (${violation.seller_email})`}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Investigator:</strong> {violation.investigator_name || '—'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {recallPath && (
            <Button size="small" variant="outlined" onClick={() => navigate(recallPath)}>
              View recall
            </Button>
          )}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
          Investigation workflow
        </Typography>
        <Stepper activeStep={activeWorkflowStep} alternativeLabel>
          <Step completed={noticeComplete}>
            <StepLabel>Notice sent</StepLabel>
          </Step>
          <Step completed={responseComplete}>
            <StepLabel>Seller response</StepLabel>
          </Step>
          <Step completed={decisionComplete}>
            <StepLabel>Final decision</StepLabel>
          </Step>
        </Stepper>
        {!responseComplete && !decisionComplete && (
          <Typography variant="body2" color="text.secondary">
            Waiting on a response record before you can submit a final decision.{' '}
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={scrollToSellerResponse}
              sx={{ cursor: 'pointer', verticalAlign: 'baseline' }}
            >
              Go to response section
            </Link>
          </Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Investigator notes
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Internal notes…"
        />
        <Button sx={{ mt: 1 }} variant="contained" size="small" onClick={saveNotes} disabled={notesSaving}>
          {notesSaving ? 'Saving…' : 'Save notes'}
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Notice / seller contact
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Log how you contacted the seller. Optionally mark the violation as Notice Sent in one step.
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Contact summary"
          value={contactSummary}
          onChange={(e) => setContactSummary(e.target.value)}
          placeholder="e.g. Sent VERO notice via marketplace portal"
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Channel (optional)"
          value={contactChannel}
          onChange={(e) => setContactChannel(e.target.value)}
          placeholder="eBay message, email…"
          sx={{ mb: 1 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={markNoticeSent}
              onChange={(e) => setMarkNoticeSent(e.target.checked)}
            />
          }
          label="Mark violation as Notice Sent (sets notice timestamp)"
        />
        <Box sx={{ mt: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={submitContact}
            disabled={contactSaving || !contactSummary.trim()}
          >
            {contactSaving ? 'Saving…' : 'Log contact'}
          </Button>
        </Box>
        {violation.notice_sent_at && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Notice sent at: {fmtDate(violation.notice_sent_at)}
          </Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Timeline
        </Typography>
        {(violation.contacts ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No contacts logged yet.
          </Typography>
        ) : (
          (violation.contacts ?? []).map((c) => (
            <Box key={c.contact_id} sx={{ mb: 2, pl: 1, borderLeft: '3px solid', borderColor: 'divider' }}>
              <Typography variant="body2" fontWeight={600}>
                Contact · {fmtDate(c.contact_sent_at)}
              </Typography>
              {c.contact_channel && (
                <Typography variant="caption" color="text.secondary">
                  {c.contact_channel}
                </Typography>
              )}
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {c.message_summary || '—'}
              </Typography>
              {(c.responses ?? []).map((r) => (
                <Box key={r.response_id} sx={{ mt: 1, ml: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {r.responder_type === 'investigator' ? 'Investigator record' : 'Response'} ·{' '}
                    {fmtDate(r.responded_at)}
                    {r.action_taken && ` · ${r.action_taken}`}
                  </Typography>
                  <Typography variant="body2">{r.response_text || '—'}</Typography>
                  {r.adjudication && (
                    <Box sx={{ mt: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={600}>
                        Decision · {r.adjudication.status}
                        {r.adjudication.reason && ` · ${r.adjudication.reason}`}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {fmtDate(r.adjudication.adjudicated_at)}
                      </Typography>
                      {r.adjudication.notes && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {r.adjudication.notes}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ))
        )}
      </Paper>

      <Paper ref={sellerResponseSectionRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Log seller response
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Creates a response record (required before final adjudication).
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          placeholder="What did the seller say or do?"
          sx={{ mb: 2 }}
        />
        <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
          <InputLabel>Action taken</InputLabel>
          <Select
            label="Action taken"
            value={responseAction}
            onChange={(e) => setResponseAction(e.target.value)}
          >
            {RESPONSE_ACTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Button
            variant="contained"
            size="small"
            onClick={submitResponse}
            disabled={responseSaving || !responseText.trim()}
          >
            {responseSaving ? 'Saving…' : 'Save response'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setNoResponseDialogOpen(true)}
            disabled={responseSaving || !canRecordNoSellerResponse}
          >
            Record no response from seller
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Final decision
        </Typography>
        {!canAdjudicate && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {violation.adjudication || violation.violation_status === 'Closed'
              ? 'This violation already has a final decision or is closed.'
              : 'Log at least one response (seller reply or “no response from seller”) before submitting a final decision.'}{' '}
            {!decisionComplete && !responseComplete && (
              <>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={scrollToSellerResponse}
                  sx={{ cursor: 'pointer', verticalAlign: 'baseline' }}
                >
                  Go to response section
                </Link>
                .
              </>
            )}
          </Typography>
        )}
        {canAdjudicate && (
          <>
            <FormControl size="small" sx={{ minWidth: 160, mr: 2, mb: 2 }}>
              <InputLabel>Outcome</InputLabel>
              <Select
                label="Outcome"
                value={adjStatus}
                onChange={(e) => setAdjStatus(e.target.value)}
              >
                {ADJ_STATUSES.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
              <InputLabel>Reason</InputLabel>
              <Select
                label="Reason"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
              >
                {ADJ_REASONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Notes (optional)"
              value={adjNotes}
              onChange={(e) => setAdjNotes(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={submitAdjudication}
              disabled={adjSaving}
            >
              {adjSaving ? 'Submitting…' : 'Submit final decision'}
            </Button>
          </>
        )}
        {violation.adjudication && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" fontWeight={600}>
              Current decision: {violation.adjudication.status}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {violation.adjudication.reason} · {fmtDate(violation.adjudication.adjudicated_at)}
            </Typography>
          </Box>
        )}
      </Paper>

      <Dialog
        open={noResponseDialogOpen}
        onClose={() => !noResponseSaving && setNoResponseDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Record no seller response</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This adds an investigator-typed response to the timeline so you can close the case when
            the seller never replied. Use the standard form above if you received an actual seller
            message.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoResponseDialogOpen(false)} disabled={noResponseSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitNoSellerResponse} disabled={noResponseSaving}>
            {noResponseSaving ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
