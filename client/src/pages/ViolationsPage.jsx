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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { normalizeAppRole, USER_ROLES } from 'shared';
import {
  VIOLATION_STATUS_TABS,
  statusColor,
  MARKETPLACE_COLORS,
} from '../constants/violations';

function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function ViolationRow({ violation, isSeller }) {
  const navigate = useNavigate();
  const mktColors = MARKETPLACE_COLORS[violation.listing_marketplace] || {};

  return (
    <TableRow
      hover
      sx={{ cursor: 'pointer' }}
      onClick={() => navigate(`/violations/${violation.violation_id}`)}
    >
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
      {!isSeller && (
        <TableCell>
          <Typography variant="body2">{violation.investigator_name || '—'}</Typography>
        </TableCell>
      )}
      <TableCell>
        <Chip
          label={violation.violation_status}
          color={statusColor(violation.violation_status)}
          size="small"
        />
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(`/violations/${violation.violation_id}`)}
        >
          {isSeller ? 'View' : 'Open'}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function ViolationsPage() {
  const { session, user, profile } = useAuth();
  const role = normalizeAppRole(profile, user?.user_metadata?.role ?? user?.app_metadata?.role);
  const isSeller = role === USER_ROLES.SELLER;
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
          {isSeller ? 'My Violations' : 'Violations'}{' '}
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
              <TableCell sx={{ fontWeight: 600 }}>Listing</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Violation Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              {!isSeller && <TableCell sx={{ fontWeight: 600 }}>Investigator</TableCell>}
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}> </TableCell>
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
                <ViolationRow key={v.violation_id} violation={v} isSeller={isSeller} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
