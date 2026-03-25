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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { supabase, isMockMode } from '../lib/supabase';
import { ALL_PROFILE_ROLES, normalizeAppRole } from 'shared';

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'CPSC Manager',
  investigator: 'Investigator',
  seller: 'Seller',
};

/** Prefer auth email; fall back to legacy username. */
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
  const { refreshProfile, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [localTypes, setLocalTypes] = useState({});
  const [localNames, setLocalNames] = useState({});

  const load = useCallback(async () => {
    if (isMockMode || !supabase) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from('profiles')
      .select('id, user_type, full_name, username, email, updated_at')
      .order('email', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true });

    if (qErr) {
      setError(qErr.message);
      setLoading(false);
      return;
    }

    const list = data ?? [];
    setRows(list);
    const t = {};
    const n = {};
    list.forEach((r) => {
      t[r.id] = canonicalRoleFromRow(r);
      n[r.id] = r.full_name ?? '';
    });
    setLocalTypes(t);
    setLocalNames(n);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = (r) =>
    (localTypes[r.id] ?? '') !== canonicalRoleFromRow(r) ||
    (localNames[r.id] ?? '') !== (r.full_name ?? '');

  const handleSave = async (id) => {
    if (!supabase) return;
    setSavingId(id);
    setError(null);
    const { error: upErr } = await supabase
      .from('profiles')
      .update({
        user_type: localTypes[id],
        full_name: localNames[id] === '' ? null : localNames[id],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (upErr) {
      setError(upErr.message);
      setSavingId(null);
      return;
    }

    setSavingId(null);
    await load();
    if (id === user?.id) {
      await refreshProfile();
    }
  };

  if (isMockMode || !supabase) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Users &amp; roles
        </Typography>
        <Alert severity="info">
          User management uses your Supabase project. Turn off mock mode and sign in with a real
          account to manage profiles here.
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
        Each row is a Supabase Auth account linked by <code>profiles.id</code>. The{' '}
        <strong>sign-in email</strong> comes from <code>profiles.email</code> (filled on signup after
        the latest DB migration, or synced from Auth). Use <strong>App role</strong> for permissions
        (stored values: admin, manager, investigator, seller — labels in the menu are for display
        only). Only admins can change roles. If no admin exists yet, promote one in the Supabase SQL
        editor once.
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
              <TableCell>Sign-in email</TableCell>
              <TableCell>Display name</TableCell>
              <TableCell>App role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">No profiles yet. Sign up a user or check RLS.</Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ minWidth: 220 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {accountLoginLabel(r) ?? 'No email stored'}
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
