import { useState, useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Link as MuiLink,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import PageTitle from '../components/PageTitle';
import { VIOLATION_STAFF_ROLES, MANAGER_ACCESS_ROLES, normalizeAppRole } from 'shared';

function sortRows(rows, key, dir) {
  const mul = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[key] ?? '';
    const vb = b[key] ?? '';
    if (va < vb) return -1 * mul;
    if (va > vb) return 1 * mul;
    return 0;
  });
}

export default function ViolationsPage() {
  const { session, profile, user } = useAuth();
  const role = normalizeAppRole(profile, user?.user_metadata?.role);
  const canCreate = VIOLATION_STAFF_ROLES.includes(role);
  const canDelete = MANAGER_ACCESS_ROLES.includes(role);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch('/api/violations', session);
    setLoading(false);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Failed to load'));
      return;
    }
    setRows(await res.json());
  };

  useEffect(() => {
    load();
  }, [session]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    return sortRows(list, sortKey, sortDir);
  }, [rows, statusFilter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this violation?')) return;
    const res = await apiFetch(`/api/violations/${id}`, session, { method: 'DELETE' });
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Delete failed'));
      return;
    }
    load();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle title="Violations" />
      <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={2} mb={2}>
        <Typography variant="h4" fontWeight={700}>
          Violations
        </Typography>
        {canCreate && (
          <Button variant="contained" component={RouterLink} to="/violations/new">
            New violation
          </Button>
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="vf">Status</InputLabel>
          <Select
            labelId="vf"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="Investigating">Investigating</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </Select>
        </FormControl>
      </Paper>
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Button size="small" onClick={() => toggleSort('recall_number')}>
                  Recall
                </Button>
              </TableCell>
              <TableCell>Platform</TableCell>
              <TableCell>Listing</TableCell>
              <TableCell>
                <Button size="small" onClick={() => toggleSort('severity')}>
                  Severity
                </Button>
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => toggleSort('status')}>
                  Status
                </Button>
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => toggleSort('created_at')}>
                  Created
                </Button>
              </TableCell>
              {canDelete && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.violation_id}>
                <TableCell>{r.recall_number}</TableCell>
                <TableCell>{r.platform}</TableCell>
                <TableCell>
                  <MuiLink href={r.listing_url} target="_blank" rel="noopener noreferrer">
                    {r.listing_url.length > 36 ? `${r.listing_url.slice(0, 36)}…` : r.listing_url}
                  </MuiLink>
                </TableCell>
                <TableCell>
                  <Chip label={r.severity} size="small" color="warning" variant="outlined" />
                </TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
                {canDelete && (
                  <TableCell align="right">
                    <IconButton
                      aria-label="Delete violation"
                      color="error"
                      size="small"
                      onClick={() => handleDelete(r.violation_id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {filtered.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No violations match filters.
        </Typography>
      )}
    </Box>
  );
}
