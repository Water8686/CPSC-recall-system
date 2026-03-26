import { useState, useEffect, useCallback, useMemo } from 'react';
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
  InputLabel,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { isMockMode } from '../lib/supabase';
import PageTitle from '../components/PageTitle';
import { ALL_PROFILE_ROLES, USER_ROLES, normalizeAppRole } from 'shared';

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'CPSC Manager',
  investigator: 'Investigator',
  seller: 'Seller',
};

function accountLoginLabel(row) {
  const email = row.email?.trim();
  if (email) return email;
  const u = row.username?.trim();
  if (u) return u;
  return null;
}

function canonicalRoleFromRow(row) {
  return normalizeAppRole({ user_type: row.user_type }, null);
}

export default function AdminUsersPage() {
  const { refreshProfile, user, session, profile } = useAuth();
  const myRole = normalizeAppRole(profile, user?.user_metadata?.role);
  const isAdmin = myRole === USER_ROLES.ADMIN;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [localTypes, setLocalTypes] = useState({});
  const [localNames, setLocalNames] = useState({});
  const [localApproved, setLocalApproved] = useState({});
  const [sortKey, setSortKey] = useState('email');
  const [sortDir, setSortDir] = useState('asc');
  const [roleFilter, setRoleFilter] = useState('');
  const [approvedFilter, setApprovedFilter] = useState('');

  const load = useCallback(async () => {
    if (isMockMode) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await apiFetch('/api/admin/profiles', session);
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
      a[r.id] = r.approved !== false;
    });
    setLocalTypes(t);
    setLocalNames(n);
    setLocalApproved(a);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedFiltered = useMemo(() => {
    let list = [...rows];
    if (roleFilter) {
      list = list.filter((r) => canonicalRoleFromRow(r) === roleFilter);
    }
    if (approvedFilter === 'yes') list = list.filter((r) => r.approved !== false);
    if (approvedFilter === 'no') list = list.filter((r) => r.approved === false);
    const mul = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let va;
      let vb;
      if (sortKey === 'email') {
        va = accountLoginLabel(a) ?? '';
        vb = accountLoginLabel(b) ?? '';
      } else if (sortKey === 'name') {
        va = a.full_name ?? '';
        vb = b.full_name ?? '';
      } else {
        va = canonicalRoleFromRow(a);
        vb = canonicalRoleFromRow(b);
      }
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
    return list;
  }, [rows, roleFilter, approvedFilter, sortKey, sortDir]);

  const dirty = (r) =>
    (localTypes[r.id] ?? '') !== canonicalRoleFromRow(r) ||
    (localNames[r.id] ?? '') !== (r.full_name ?? '') ||
    (localApproved[r.id] !== false) !== (r.approved !== false);

  const handleSave = async (id) => {
    setSavingId(id);
    setError(null);
    const body = {
      full_name: localNames[id] === '' ? null : localNames[id],
      approved: localApproved[id] !== false,
    };
    if (isAdmin) {
      body.user_type = localTypes[id];
    }
    const res = await apiFetch(`/api/admin/profiles/${id}`, session, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Save failed'));
      setSavingId(null);
      return;
    }
    setSavingId(null);
    await load();
    if (id === user?.id) await refreshProfile();
  };

  if (isMockMode) {
    return (
      <Box>
        <PageTitle title="Users and roles" />
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
      <PageTitle title="Users and roles" />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Users &amp; roles
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        Approve new accounts and assign roles. Changes use the Express API with service-role access.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="rf">Role</InputLabel>
          <Select
            labelId="rf"
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {ALL_PROFILE_ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="af">Approved</InputLabel>
          <Select
            labelId="af"
            label="Approved"
            value={approvedFilter}
            onChange={(e) => setApprovedFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="yes">Approved</MenuItem>
            <MenuItem value="no">Pending</MenuItem>
          </Select>
        </FormControl>
        <Button size="small" onClick={() => setSortKey('email')}>
          Sort email {sortKey === 'email' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </Button>
        <Button size="small" onClick={() => setSortKey('name')}>
          Sort name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </Button>
      </Paper>
      <Paper sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sign-in email</TableCell>
              <TableCell>Display name</TableCell>
              <TableCell>App role</TableCell>
              <TableCell>Approved</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedFiltered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">No users match filters.</Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {sortedFiltered.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ minWidth: 200 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {accountLoginLabel(r) ?? '—'}
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
                  {isAdmin ? (
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
                  ) : (
                    <Typography variant="body2">{ROLE_LABELS[canonicalRoleFromRow(r)] ?? '—'}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={localApproved[r.id] !== false}
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
