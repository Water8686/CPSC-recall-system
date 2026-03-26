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
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import PageTitle from '../components/PageTitle';
import { USER_ROLES, normalizeAppRole } from 'shared';

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

export default function ResponsesPage() {
  const { session, profile, user } = useAuth();
  const role = normalizeAppRole(profile, user?.user_metadata?.role);
  const isSeller = role === USER_ROLES.SELLER;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await apiFetch('/api/violation-responses', session);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(await getApiErrorMessage(res, 'Failed to load'));
        return;
      }
      setRows(await res.json());
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    return sortRows(list, sortKey, sortDir);
  }, [rows, statusFilter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <Box>
      <PageTitle title="Responses" />
      <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={2} mb={2}>
        <Typography variant="h4" fontWeight={700}>
          Seller responses
        </Typography>
        {isSeller && (
          <Button variant="outlined" component={RouterLink} to="/responses/new">
            New response
          </Button>
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="sf">Status</InputLabel>
              <Select
                labelId="sf"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Submitted">Submitted</MenuItem>
                <MenuItem value="Under Review">Under Review</MenuItem>
                <MenuItem value="Accepted">Accepted</MenuItem>
              </Select>
            </FormControl>
          </Paper>
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Violation</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Preview</TableCell>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.response_id}>
                    <TableCell>{r.violation_id}</TableCell>
                    <TableCell>{r.response_type}</TableCell>
                    <TableCell>
                      {r.response_text.length > 60 ? `${r.response_text.slice(0, 60)}…` : r.response_text}
                    </TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
