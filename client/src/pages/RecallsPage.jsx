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

  // Sorting
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

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
        let aVal, bVal;
        if (sortField === 'priority') {
          const order = { High: 0, Medium: 1, Low: 2 };
          aVal = order[prioritizations[a.recall_id]?.priority] ?? 3;
          bVal = order[prioritizations[b.recall_id]?.priority] ?? 3;
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

      {/* Data Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
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
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
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
    </Box>
  );
}
