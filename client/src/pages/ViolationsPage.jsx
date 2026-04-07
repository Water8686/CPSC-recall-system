import { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { normalizeAppRole } from 'shared';
import {
  VIOLATION_STATUS_TABS,
  statusColor,
  MARKETPLACE_COLORS,
} from '../constants/violations';

function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function ViolationRow({ violation, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();
  const mktColors = MARKETPLACE_COLORS[violation.listing_marketplace] || {};

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await onStatusChange(violation.violation_id, {
        violation_status: newStatus,
        ...(newStatus === 'Notice Sent' ? { notice_sent_at: new Date().toISOString() } : {}),
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '& > *': { borderBottom: open ? 'none' : undefined } }}
        onClick={() => setOpen(!open)}
      >
        <TableCell padding="checkbox">
          <IconButton size="small">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {violation.listing_title || `Violation #${violation.violation_id}`}
          </Typography>
          {violation.listing_marketplace && (
            <Chip
              label={violation.listing_marketplace}
              size="small"
              sx={{
                bgcolor: mktColors.bg,
                color: mktColors.text,
                fontSize: '0.65rem',
                height: 18,
                mt: 0.5,
              }}
            />
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontSize: '0.825rem' }}>
            {violation.violation_type || '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{fmtDate(violation.date_of_violation)}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{violation.investigator_name || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={violation.violation_status}
            color={statusColor(violation.violation_status)}
            size="small"
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                {violation.listing_url && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Listing URL:</strong>{' '}
                    <a href={violation.listing_url} target="_blank" rel="noreferrer">
                      {violation.listing_url}
                    </a>
                  </Typography>
                )}
                {violation.seller_name && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Seller:</strong> {violation.seller_name}
                    {violation.seller_email && ` (${violation.seller_email})`}
                  </Typography>
                )}
                {violation.notes && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Notes:</strong> {violation.notes}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {violation.violation_status === 'Open' && (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={updating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate('Notice Sent');
                      }}
                    >
                      Mark Notice Sent
                    </Button>
                  )}
                  {violation.violation_status === 'Notice Sent' && (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={updating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate('Response Received');
                      }}
                    >
                      Mark Response Received
                    </Button>
                  )}
                  {violation.violation_status === 'Response Received' && (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={updating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate('Closed');
                      }}
                    >
                      Close
                    </Button>
                  )}
                  {violation.recall_id && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recalls/${violation.recall_id}`);
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
    </>
  );
}

export default function ViolationsPage() {
  const { session } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/violations', session);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        setViolations(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  const handleStatusChange = async (violationId, fields) => {
    const res = await apiFetch(`/api/violations/${violationId}`, session, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error(await getApiErrorMessage(res));
    const updated = await res.json();
    setViolations((prev) =>
      prev.map((v) => (v.violation_id === violationId ? updated : v)),
    );
  };

  const filtered = useMemo(() => {
    let list = violations;
    if (statusFilter !== 'All') {
      list = list.filter((v) => v.violation_status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          (v.listing_title || '').toLowerCase().includes(q) ||
          (v.violation_type || '').toLowerCase().includes(q) ||
          (v.investigator_name || '').toLowerCase().includes(q),
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
          Violations{' '}
          <Typography component="span" variant="h5" color="text.secondary" fontWeight={400}>
            ({filtered.length})
          </Typography>
        </Typography>
        <TextField
          size="small"
          placeholder="Search violations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220 }}
        />
      </Box>

      {/* Status filter pills */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {VIOLATION_STATUS_TABS.map((status) => {
          const count = status === 'All'
            ? violations.length
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
              <TableCell sx={{ fontWeight: 600 }}>Violation Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Investigator</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No violations found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <ViolationRow
                  key={v.violation_id}
                  violation={v}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
