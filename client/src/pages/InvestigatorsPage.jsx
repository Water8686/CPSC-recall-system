import { useState, useEffect, useMemo } from 'react';
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
  TableSortLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { canAccessManagerFeatures, normalizeAppRole } from 'shared';

function formatDate(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return value;
  return dt.toLocaleDateString();
}

function priorityColor(priority) {
  if (priority === 'High') return 'error';
  if (priority === 'Medium') return 'warning';
  if (priority === 'Low') return 'success';
  return 'default';
}

function violationColor(status) {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'open') return 'error';
  if (s === 'closed') return 'success';
  return 'warning';
}

export default function InvestigatorsPage() {
  const { user, profile, session } = useAuth();
  const role = normalizeAppRole(profile, user?.user_metadata?.role ?? user?.app_metadata?.role);
  const isManager = canAccessManagerFeatures(role);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [violationFilter, setViolationFilter] = useState('');
  const [investigatorFilter, setInvestigatorFilter] = useState('');
  const [sortField, setSortField] = useState('assigned_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch('/api/investigators/queue', session)
      .then(async (res) => {
        if (!res.ok) {
          const msg = await getApiErrorMessage(res, 'Failed to load investigator queue');
          throw new Error(msg);
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setRows(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [session]);

  const investigatorIds = useMemo(() => {
    const ids = new Set(rows.map((r) => r.investigator_user_id).filter(Boolean));
    return Array.from(ids).sort((a, b) => a - b);
  }, [rows]);

  const violationStatuses = useMemo(() => {
    const statuses = new Set(rows.map((r) => r.violation_status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.recall_id?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q) ||
          r.product?.toLowerCase().includes(q),
      );
    }

    if (violationFilter) {
      result = result.filter((r) => r.violation_status === violationFilter);
    }

    if (isManager && investigatorFilter) {
      result = result.filter(
        (r) => String(r.investigator_user_id) === investigatorFilter,
      );
    }

    result = [...result].sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';
      if (sortField === 'assigned_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [rows, search, violationFilter, investigatorFilter, isManager, sortField, sortDir]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Investigators
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            label="Search recall # / title / product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 240 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Violation status</InputLabel>
            <Select
              value={violationFilter}
              label="Violation status"
              onChange={(e) => setViolationFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {violationStatuses.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {isManager && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Investigator</InputLabel>
              <Select
                value={investigatorFilter}
                label="Investigator"
                onChange={(e) => setInvestigatorFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {investigatorIds.map((id) => (
                  <MenuItem key={id} value={String(id)}>
                    ID {id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'recall_id'}
                    direction={sortField === 'recall_id' ? sortDir : 'asc'}
                    onClick={() => handleSort('recall_id')}
                  >
                    Recall #
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'title'}
                    direction={sortField === 'title' ? sortDir : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    Title / Product
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'priority'}
                    direction={sortField === 'priority' ? sortDir : 'asc'}
                    onClick={() => handleSort('priority')}
                  >
                    Priority
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'violation_status'}
                    direction={sortField === 'violation_status' ? sortDir : 'asc'}
                    onClick={() => handleSort('violation_status')}
                  >
                    Violation Status
                  </TableSortLabel>
                </TableCell>
                {isManager && (
                  <TableCell>Investigator ID</TableCell>
                )}
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'assigned_at'}
                    direction={sortField === 'assigned_at' ? sortDir : 'asc'}
                    onClick={() => handleSort('assigned_at')}
                  >
                    Assigned At
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isManager ? 6 : 5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No assignments found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, idx) => (
                  <TableRow key={`${row.recall_id}-${idx}`} hover>
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {row.recall_id}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {row.title}
                      </Typography>
                      {row.product && (
                        <Typography variant="caption" color="text.secondary">
                          {row.product}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.priority ? (
                        <Chip label={row.priority} color={priorityColor(row.priority)} size="small" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.violation_status ? (
                        <Chip label={row.violation_status} color={violationColor(row.violation_status)} size="small" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    {isManager && (
                      <TableCell>{row.investigator_user_id ?? '—'}</TableCell>
                    )}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(row.assigned_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
