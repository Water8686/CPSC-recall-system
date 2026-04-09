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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  TableSortLabel,
  Checkbox,
  Button,
  Snackbar,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import {
  canAccessManagerFeatures,
  normalizeAppRole,
} from 'shared';
import {
  getPriorityBgColor,
} from '../constants/priorities';

const ASSIGNABLE_ROLES = new Set(['admin', 'manager', 'investigator']);

function formatInvestigatorLabel(users, userId) {
  const u = users.find((x) => String(x.user_id) === String(userId));
  return (u?.full_name && String(u.full_name).trim()) || u?.email || `User ${userId}`;
}

function formatDate(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return String(value);
  return dt.toLocaleDateString();
}

export default function RecallsPage() {
  const { session, profile, user } = useAuth();
  const navigate = useNavigate();
  const role = normalizeAppRole(
    profile,
    user?.user_metadata?.role ?? user?.app_metadata?.role,
  );
  const canPrioritize = canAccessManagerFeatures(role);

  const [recalls, setRecalls] = useState([]);
  const [prioritizations, setPrioritizations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Sorting — default newest recall_date first
  const [sortField, setSortField] = useState('recall_date');
  const [sortDir, setSortDir] = useState('desc');

  const [selectedRecallNumbers, setSelectedRecallNumbers] = useState(() => new Set());
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [bulkInvestigator, setBulkInvestigator] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [assignSnackbar, setAssignSnackbar] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [recallsRes, priorRes] = await Promise.all([
          apiFetch('/api/recalls', session),
          apiFetch('/api/prioritizations', session),
        ]);
        if (!recallsRes.ok) throw new Error(await getApiErrorMessage(recallsRes));
        if (!priorRes.ok) throw new Error(await getApiErrorMessage(priorRes));

        setRecalls(await recallsRes.json());
        const priorData = await priorRes.json();
        const priorMap = {};
        priorData.forEach((p) => { priorMap[p.recall_id] = p; });
        setPrioritizations(priorMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [session]);

  useEffect(() => {
    if (!canPrioritize || !session) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/users', session);
        if (!res.ok || cancelled) return;
        const rows = await res.json();
        if (cancelled) return;
        setAssignableUsers(
          (rows ?? []).filter(
            (u) => u.approved !== false && ASSIGNABLE_ROLES.has(u.role),
          ),
        );
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canPrioritize, session]);

  const filtered = useMemo(() => {
    let list = recalls;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          (r.product || r.product_name || '').toLowerCase().includes(q) ||
          (r.recall_id || '').toString().toLowerCase().includes(q) ||
          (r.manufacturer || '').toLowerCase().includes(q),
      );
    }

    if (priorityFilter !== 'All') {
      list = list.filter((r) => {
        const p = prioritizations[r.recall_id];
        return p?.priority === priorityFilter;
      });
    }

    if (sortField) {
      list = [...list].sort((a, b) => {
        let aVal;
        let bVal;
        if (sortField === 'priority') {
          const order = { High: 0, Medium: 1, Low: 2 };
          aVal = order[prioritizations[a.recall_id]?.priority] ?? 3;
          bVal = order[prioritizations[b.recall_id]?.priority] ?? 3;
        } else if (sortField === 'recall_date') {
          const ts = (row) => {
            const d = new Date(row.recall_date);
            return Number.isFinite(d.getTime()) ? d.getTime() : Number.NEGATIVE_INFINITY;
          };
          aVal = ts(a);
          bVal = ts(b);
        } else {
          aVal = a[sortField] ?? '';
          bVal = b[sortField] ?? '';
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [recalls, search, priorityFilter, prioritizations, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleRecallSelected = (recallNumber) => {
    setSelectedRecallNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(recallNumber)) next.delete(recallNumber);
      else next.add(recallNumber);
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((r) => selectedRecallNumbers.has(r.recall_id));
  const someFilteredSelected = filtered.some((r) =>
    selectedRecallNumbers.has(r.recall_id),
  );

  const toggleSelectAllFiltered = () => {
    setSelectedRecallNumbers((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((r) => next.delete(r.recall_id));
      } else {
        filtered.forEach((r) => next.add(r.recall_id));
      }
      return next;
    });
  };

  async function handleBulkAssign() {
    const invId = Number.parseInt(bulkInvestigator, 10);
    if (!Number.isFinite(invId) || invId < 1) {
      setBulkError('Choose an investigator.');
      return;
    }
    const ids = [...selectedRecallNumbers];
    if (ids.length === 0) {
      setBulkError('Select at least one recall.');
      return;
    }
    setBulkError(null);
    setBulkAssigning(true);
    const failures = [];
    try {
      for (const recall_id of ids) {
        const res = await apiFetch('/api/assignments', session, {
          method: 'POST',
          body: JSON.stringify({
            recall_id,
            investigator_user_id: invId,
          }),
        });
        if (!res.ok) {
          failures.push({
            recall_id,
            message: await getApiErrorMessage(res),
          });
        }
      }
      if (failures.length === 0) {
        const name = formatInvestigatorLabel(assignableUsers, invId);
        const n = ids.length;
        setSelectedRecallNumbers(new Set());
        setBulkInvestigator('');
        setAssignSnackbar({
          severity: 'success',
          message:
            n === 1
              ? `Assigned 1 recall to ${name}.`
              : `Assigned ${n} recalls to ${name}.`,
        });
      } else if (failures.length === ids.length) {
        setBulkError(failures[0].message);
      } else {
        const ok = ids.length - failures.length;
        setSelectedRecallNumbers(new Set(failures.map((f) => f.recall_id)));
        setAssignSnackbar({
          severity: 'warning',
          message: `Assigned ${ok} of ${ids.length} recalls. ${failures[0].message} Failed recalls stay selected.`,
        });
      }
    } catch (err) {
      setBulkError(err.message || 'Assignment failed');
    } finally {
      setBulkAssigning(false);
    }
  }

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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Active Recalls{' '}
          <Typography component="span" variant="h5" color="text.secondary" fontWeight={400}>
            ({filtered.length})
          </Typography>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search recalls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {canPrioritize && selectedRecallNumbers.size > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 1.5,
            mb: 2,
            py: 1.5,
            px: 1.5,
            borderRadius: 1,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mr: 0.5, alignSelf: 'center', pb: 0.5 }}
          >
            {selectedRecallNumbers.size} selected
          </Typography>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="bulk-investigator-label" shrink>
              Investigator
            </InputLabel>
            <Select
              labelId="bulk-investigator-label"
              label="Investigator"
              value={bulkInvestigator}
              onChange={(e) => setBulkInvestigator(e.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (selected === '' || selected == null) {
                  return (
                    <Typography variant="body2" color="text.secondary" component="span">
                      Select investigator
                    </Typography>
                  );
                }
                return formatInvestigatorLabel(assignableUsers, selected);
              }}
            >
              <MenuItem value="">
                <em>Select investigator</em>
              </MenuItem>
              {assignableUsers.map((u) => (
                <MenuItem key={u.user_id} value={String(u.user_id)}>
                  {(u.full_name && u.full_name.trim()) || u.email || `User ${u.user_id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            disabled={bulkAssigning || !bulkInvestigator}
            onClick={handleBulkAssign}
            sx={{ mb: 0.25 }}
          >
            {bulkAssigning ? 'Assigning…' : 'Assign'}
          </Button>
        </Box>
      )}

      {bulkError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBulkError(null)}>
          {bulkError}
        </Alert>
      )}

      {/* Data Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              {canPrioritize && (
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  <Checkbox
                    size="small"
                    checked={allFilteredSelected}
                    indeterminate={someFilteredSelected && !allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    inputProps={{ 'aria-label': 'Select all visible recalls' }}
                  />
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === 'title'}
                  direction={sortField === 'title' ? sortDir : 'asc'}
                  onClick={() => handleSort('title')}
                >
                  Product
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Hazard</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === 'recall_date'}
                  direction={sortField === 'recall_date' ? sortDir : 'asc'}
                  onClick={() => handleSort('recall_date')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === 'priority'}
                  direction={sortField === 'priority' ? sortDir : 'asc'}
                  onClick={() => handleSort('priority')}
                >
                  Priority
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canPrioritize ? 5 : 4}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <Typography color="text.secondary">
                    {search || priorityFilter !== 'All'
                      ? 'No recalls match your filters.'
                      : 'No recalls found.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((recall) => {
                const prior = prioritizations[recall.recall_id];
                const priority = prior?.priority;
                const priorityColors = priority ? getPriorityBgColor(priority) : null;
                return (
                  <TableRow
                    key={recall.recall_id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/recalls/${recall.recall_id}`)}
                  >
                    {canPrioritize && (
                      <TableCell
                        padding="checkbox"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          size="small"
                          checked={selectedRecallNumbers.has(recall.recall_id)}
                          onChange={() => toggleRecallSelected(recall.recall_id)}
                          inputProps={{
                            'aria-label': `Select recall ${recall.recall_id}`,
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {recall.title || recall.product_name || recall.recall_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Recall #{recall.recall_id}
                        {recall.manufacturer && <> &middot; {recall.manufacturer}</>}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="error.main" sx={{ fontSize: '0.825rem' }}>
                        {recall.hazard || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(recall.recall_date)}</Typography>
                    </TableCell>
                    <TableCell>
                      {priority && priorityColors ? (
                        <Chip
                          label={priority}
                          size="small"
                          variant="outlined"
                          sx={{
                            bgcolor: priorityColors.bgcolor,
                            color: priorityColors.color,
                            borderColor: priorityColors.borderColor,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={!!assignSnackbar}
        autoHideDuration={assignSnackbar?.severity === 'warning' ? 8000 : 5000}
        onClose={() => setAssignSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAssignSnackbar(null)}
          severity={assignSnackbar?.severity ?? 'success'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {assignSnackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
