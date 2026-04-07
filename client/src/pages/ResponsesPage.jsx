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
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { statusColor } from '../constants/violations';

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
  if (violationStatus === 'Notice Sent') return 'Awaiting Response';
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
  const [responseSaving, setResponseSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  // Expanded rows
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/violations', session);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const all = await res.json();
        // Only show violations that have reached "Notice Sent" or beyond
        setViolations(all.filter((v) =>
          ['Notice Sent', 'Response Received', 'Closed'].includes(v.violation_status),
        ));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  const handleMarkReceived = (violation) => {
    setDialogViolation(violation);
    setResponseNotes('');
    setDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    setResponseSaving(true);
    try {
      const res = await apiFetch(`/api/violations/${dialogViolation.violation_id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({
          violation_status: 'Response Received',
          notes: responseNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const updated = await res.json();
      setViolations((prev) =>
        prev.map((v) => (v.violation_id === updated.violation_id ? updated : v)),
      );
      setDialogOpen(false);
      setSnackbar('Response recorded');
    } catch (err) {
      setError(err.message);
    } finally {
      setResponseSaving(false);
    }
  };

  const handleClose = async (violationId) => {
    try {
      const res = await apiFetch(`/api/violations/${violationId}`, session, {
        method: 'PATCH',
        body: JSON.stringify({ violation_status: 'Closed' }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const updated = await res.json();
      setViolations((prev) =>
        prev.map((v) => (v.violation_id === updated.violation_id ? updated : v)),
      );
      setSnackbar('Violation closed');
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = useMemo(() => {
    let list = violations;
    if (statusFilter !== 'All') {
      if (statusFilter === 'Awaiting Response') {
        list = list.filter((v) => v.violation_status === 'Notice Sent');
      } else {
        list = list.filter((v) => v.violation_status === statusFilter);
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220 }}
        />
      </Box>

      {/* Status filter pills */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((status) => {
          const count = status === 'All'
            ? violations.length
            : status === 'Awaiting Response'
              ? violations.filter((v) => v.violation_status === 'Notice Sent').length
              : violations.filter((v) => v.violation_status === status).length;
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
                        <IconButton size="small">
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
                              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                {v.violation_status === 'Notice Sent' && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkReceived(v);
                                    }}
                                  >
                                    Mark Response Received
                                  </Button>
                                )}
                                {v.violation_status === 'Response Received' && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClose(v.violation_id);
                                    }}
                                  >
                                    Close
                                  </Button>
                                )}
                                {v.recall_id && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/recalls/${v.recall_id}`);
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
            label="Response Notes"
            multiline
            minRows={3}
            fullWidth
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            placeholder="What did the seller respond with?"
          />
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
