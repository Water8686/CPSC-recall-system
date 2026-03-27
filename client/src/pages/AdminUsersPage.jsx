import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  Button,
  Alert,
  CircularProgress,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { ALL_PROFILE_ROLES, normalizeAppRole } from 'shared';

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'CPSC Manager',
  investigator: 'Investigator',
  seller: 'Seller',
};

function accountLoginLabel(row) {
  const email = row.email?.trim();
  if (email) return email;
  return null;
}

function canonicalRoleFromRow(row) {
  return normalizeAppRole({ user_type: row.user_type }, null);
}

export default function AdminUsersPage() {
  const { session, refreshProfile, user, isMockMode } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [localTypes, setLocalTypes] = useState({});
  const [localNames, setLocalNames] = useState({});
  const [localApproved, setLocalApproved] = useState({});

  const load = useCallback(async () => {
    if (isMockMode) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await apiFetch('/api/admin/users', session);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Failed to load users'));
      setLoading(false);
      return;
    }
    const list = await res.json();
    setRows(list);
    const t = {};
    const n = {};
    const a = {};
    list.forEach((r) => {
      t[r.id] = canonicalRoleFromRow(r);
      n[r.id] = r.full_name ?? '';
      a[r.id] = Boolean(r.approved);
    });
    setLocalTypes(t);
    setLocalNames(n);
    setLocalApproved(a);
    setLoading(false);
  }, [session, isMockMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = (r) =>
    (localTypes[r.id] ?? '') !== canonicalRoleFromRow(r) ||
    (localNames[r.id] ?? '') !== (r.full_name ?? '') ||
    (localApproved[r.id] ?? false) !== Boolean(r.approved);

  const handleSave = async (id) => {
    setSavingId(id);
    setError(null);
    const res = await apiFetch(`/api/admin/users/${id}`, session, {
      method: 'PATCH',
      body: JSON.stringify({
        user_type: localTypes[id],
        full_name: localNames[id] === '' ? null : localNames[id],
        approved: localApproved[id],
      }),
    });
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Save failed'));
      setSavingId(null);
      return;
    }

    setSavingId(null);
    await load();
    if (id === user?.id) {
      await refreshProfile();
    }
  };

  if (isMockMode) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Users &amp; roles
        </Typography>
        <Alert severity="info">
          User management uses the API. Turn off mock mode and sign in with a real account.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Users &amp; roles
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Each row is an <code>app_users</code> record (database auth, class project). Use{' '}
        <strong>Approved</strong> before a user can sign in (except bootstrap admins). App role
        values: admin, manager, investigator, seller.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Paper sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Display name</TableCell>
              <TableCell>App role</TableCell>
              <TableCell>Approved</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">No users yet. Register the first account (becomes admin).</Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ minWidth: 220 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {accountLoginLabel(r) ?? 'No email'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    id {r.id}
                  </Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 160 }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={localNames[r.id] ?? ''}
                    onChange={(e) =>
                      setLocalNames((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    placeholder="Full name"
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={localTypes[r.id] ?? canonicalRoleFromRow(r)}
                      onChange={(e) =>
                        setLocalTypes((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                    >
                      {ALL_PROFILE_ROLES.map((roleVal) => (
                        <MenuItem key={roleVal} value={roleVal}>
                          {ROLE_LABELS[roleVal] ?? roleVal}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localApproved[r.id] ?? false}
                        onChange={(e) =>
                          setLocalApproved((prev) => ({ ...prev, [r.id]: e.target.checked }))
                        }
                      />
                    }
                    label=""
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!dirty(r) || savingId === r.id}
                    onClick={() => handleSave(r.id)}
                  >
                    {savingId === r.id ? 'Saving…' : 'Save'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
