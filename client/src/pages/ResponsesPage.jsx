import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { statusColor } from '../constants/violations';
import { SPRINT3_VIOLATION_STATUS } from 'shared';

const POST_NOTICE_STATUSES = [
  SPRINT3_VIOLATION_STATUS.NOTICE_SENT,
  SPRINT3_VIOLATION_STATUS.RESPONSE_SUBMITTED,
  SPRINT3_VIOLATION_STATUS.APPROVED,
  SPRINT3_VIOLATION_STATUS.REJECTED,
  SPRINT3_VIOLATION_STATUS.ESCALATED,
];

const CLOSED_STATUSES = [
  SPRINT3_VIOLATION_STATUS.APPROVED,
  SPRINT3_VIOLATION_STATUS.REJECTED,
  SPRINT3_VIOLATION_STATUS.ESCALATED,
];

function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function daysElapsed(dateStr) {
  if (!dateStr) return '—';
  const sent = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - sent) / (1000 * 60 * 60 * 24));
  return diff;
}

const STATUS_FILTERS = ['All', 'Awaiting Response', 'Response Received', 'Closed'];

function mapResponseStatus(violationStatus) {
  if (violationStatus === SPRINT3_VIOLATION_STATUS.NOTICE_SENT) return 'Awaiting Response';
  if (violationStatus === SPRINT3_VIOLATION_STATUS.RESPONSE_SUBMITTED) return 'Response Received';
  if (CLOSED_STATUSES.includes(violationStatus)) return 'Closed';
  return violationStatus;
}

export default function ResponsesPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Response dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogViolation, setDialogViolation] = useState(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [responseAction, setResponseAction] = useState('no_action');
  const [responseSaving, setResponseSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  // Expanded rows
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await apiFetch('/api/violations', session, { signal: controller.signal });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const all = await res.json();
        if (controller.signal.aborted) return;
        // Only show violations that have reached "Notice Sent" or beyond
        setViolations(all.filter((v) => POST_NOTICE_STATUSES.includes(v.violation_status)));
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [session]);

  const handleMarkReceived = (violation) => {
    setDialogViolation(violation);
    setResponseNotes('');
    setResponseAction('no_action');
    setDialogOpen(true);
  };

  async function reloadViolations() {
    const res = await apiFetch('/api/violations', session);
    if (!res.ok) return;
    const all = await res.json();
    setViolations(all.filter((v) => POST_NOTICE_STATUSES.includes(v.violation_status)));
  }

  const handleSubmitResponse = async () => {
    if (!dialogViolation || !responseNotes.trim()) {
      setError('Response text is required.');
      return;
    }
    setResponseSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/responses', session, {
        method: 'POST',
        body: JSON.stringify({
          violation_id: dialogViolation.violation_id,
          response_text: responseNotes.trim(),
          action_taken: responseAction,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      await reloadViolations();
      setDialogOpen(false);
      setSnackbar('Response recorded');
    } catch (err) {
      setError(err.message);
    } finally {
      setResponseSaving(false);
    }
  };

  // Closing a violation now requires an adjudication record — users navigate to the detail page.

  const filtered = useMemo(() => {
    let list = violations;
    if (statusFilter !== 'All') {
      if (statusFilter === 'Awaiting Response') {
        list = list.filter((v) => v.violation_status === SPRINT3_VIOLATION_STATUS.NOTICE_SENT);
      } else if (statusFilter === 'Response Received') {
        list = list.filter(
          (v) => v.violation_status === SPRINT3_VIOLATION_STATUS.RESPONSE_SUBMITTED,
        );
      } else if (statusFilter === 'Closed') {
        list = list.filter((v) => CLOSED_STATUSES.includes(v.violation_status));
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          (v.listing_title || '').toLowerCase().includes(q) ||
          (v.seller_name || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [violations, statusFilter, search]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Responses{' '}
          <Typography component="span" variant="h5" color="text.secondary" fontWeight={400}>
            ({filtered.length})
          </Typography>
        </Typography>
        <TextField
          size="small"
          placeholder="Search..."
          aria-label="Search responses"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220 }}
        />
      </Box>

      {/* Status filter pills */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((status) => {
          const count =
            status === 'All'
              ? violations.length
              : status === 'Awaiting Response'
                ? violations.filter(
                    (v) => v.violation_status === SPRINT3_VIOLATION_STATUS.NOTICE_SENT,
                  ).length
                : status === 'Response Received'
                  ? violations.filter(
                      (v) => v.violation_status === SPRINT3_VIOLATION_STATUS.RESPONSE_SUBMITTED,
                    ).length
                  : violations.filter((v) => CLOSED_STATUSES.includes(v.violation_status)).length;
          return (
            <Chip
              key={status}
              label={`${status} (${count})`}
              variant={statusFilter === status ? 'filled' : 'outlined'}
              color={statusFilter === status ? 'primary' : 'default'}
              onClick={() => setStatusFilter(status)}
              sx={{ fontWeight: statusFilter === status ? 600 : 400 }}
            />
          );
        })}
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox" />
              <TableCell sx={{ fontWeight: 600 }}>Listing</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Seller</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Notice Sent</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Response Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Days Elapsed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No responses to track yet. Violations will appear here once notices are sent.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => {
                const isOpen = expandedId === v.violation_id;
                const days = daysElapsed(v.notice_sent_at);
                return (
                  <React.Fragment key={v.violation_id}>
                    <TableRow
                      hover
                      sx={{ cursor: 'pointer', '& > *': { borderBottom: isOpen ? 'none' : undefined } }}
                      onClick={() => setExpandedId(isOpen ? null : v.violation_id)}
                    >
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {v.listing_title || `Violation #${v.violation_id}`}
                        </Typography>
                        {v.listing_marketplace && (
                          <Typography variant="caption" color="text.secondary">
                            {v.listing_marketplace}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{v.seller_name || '—'}</Typography>
                        {v.seller_email && (
                          <Typography variant="caption" color="text.secondary">
                            {v.seller_email}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fmtDate(v.notice_sent_at)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {v.latest_response ? fmtDate(v.latest_response.responded_at) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={mapResponseStatus(v.violation_status)}
                          color={statusColor(v.violation_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={typeof days === 'number' && days > 14 ? 'error.main' : 'text.primary'}
                        >
                          {typeof days === 'number' ? `${days}d` : days}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ py: 0 }} colSpan={7}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Violation Type:</strong> {v.violation_type || '—'}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Date of Violation:</strong> {fmtDate(v.date_of_violation)}
                              </Typography>
                              {v.notes && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Notes:</strong> {v.notes}
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/violations/${v.violation_id}`);
                                  }}
                                >
                                  Open record
                                </Button>
                                {v.violation_status === SPRINT3_VIOLATION_STATUS.NOTICE_SENT && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkReceived(v);
                                    }}
                                  >
                                    Quick log response
                                  </Button>
                                )}
                                {v.violation_status === SPRINT3_VIOLATION_STATUS.RESPONSE_SUBMITTED && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/violations/${v.violation_id}`);
                                    }}
                                  >
                                    Adjudicate
                                  </Button>
                                )}
                                {v.recall_number && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/recalls/${encodeURIComponent(String(v.recall_number).trim())}`);
                                    }}
                                  >
                                    View Recall
                                  </Button>
                                )}
                              </Box>
                            </Paper>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mark Response Received Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Response</DialogTitle>
        <DialogContent>
          {dialogViolation && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
              Recording response for: <strong>{dialogViolation.listing_title}</strong>
            </Typography>
          )}
          <TextField
            label="Response text"
            multiline
            minRows={3}
            fullWidth
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            placeholder="What did the seller respond with?"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Action taken</InputLabel>
            <Select
              label="Action taken"
              value={responseAction}
              onChange={(e) => setResponseAction(e.target.value)}
            >
              <MenuItem value="listing_removed">Listing removed</MenuItem>
              <MenuItem value="listing_edited">Listing edited</MenuItem>
              <MenuItem value="disputed">Disputed</MenuItem>
              <MenuItem value="no_action">No action</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={responseSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitResponse} disabled={responseSaving}>
            {responseSaving ? 'Saving...' : 'Record Response'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
