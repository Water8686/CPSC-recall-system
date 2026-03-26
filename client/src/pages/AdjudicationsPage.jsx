import { useState, useEffect } from 'react';
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
  ButtonGroup,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import PageTitle from '../components/PageTitle';
import { ADJUDICATION_STATUS, VIOLATION_STAFF_ROLES, normalizeAppRole } from 'shared';

export default function AdjudicationsPage() {
  const { session, profile, user } = useAuth();
  const role = normalizeAppRole(profile, user?.user_metadata?.role);
  const canAdjudicate = VIOLATION_STAFF_ROLES.includes(role);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch('/api/violations', session);
    setLoading(false);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Failed to load'));
      return;
    }
    const all = await res.json();
    setRows(all.filter((v) => !v.adjudication_status || v.status === 'Investigating'));
  };

  useEffect(() => {
    load();
  }, [session]);

  const patch = async (id, adjudication_status) => {
    const res = await apiFetch(`/api/violations/${id}`, session, {
      method: 'PATCH',
      body: JSON.stringify({ adjudication_status }),
    });
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Update failed'));
      return;
    }
    load();
  };

  if (!canAdjudicate) {
    return (
      <Box>
        <PageTitle title="Adjudications" />
        <Alert severity="info">You do not have permission to adjudicate violations.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle title="Adjudications" />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Adjudications
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Review open violations and record a decision.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Recall</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Listing</TableCell>
              <TableCell>Current</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.violation_id}>
                <TableCell>{r.violation_id}</TableCell>
                <TableCell>{r.recall_number}</TableCell>
                <TableCell>{r.severity}</TableCell>
                <TableCell sx={{ maxWidth: 220 }}>{r.listing_url}</TableCell>
                <TableCell>{r.adjudication_status ?? '—'}</TableCell>
                <TableCell align="right">
                  <ButtonGroup size="small" variant="outlined">
                    <Button onClick={() => patch(r.violation_id, ADJUDICATION_STATUS.APPROVED)}>
                      Approve
                    </Button>
                    <Button onClick={() => patch(r.violation_id, ADJUDICATION_STATUS.REJECTED)}>
                      Reject
                    </Button>
                    <Button onClick={() => patch(r.violation_id, ADJUDICATION_STATUS.ESCALATED)}>
                      Escalate
                    </Button>
                  </ButtonGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No violations awaiting adjudication.
        </Typography>
      )}
    </Box>
  );
}
