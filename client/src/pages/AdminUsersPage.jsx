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
import { ALL_PROFILE_ROLES } from 'shared';

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'CPSC Manager',
  investigator: 'Investigator',
  seller: 'Seller',
};

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
      .select('id, user_type, full_name, username, updated_at')
      .order('username', { ascending: true, nullsFirst: false });

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
      t[r.id] = r.user_type ?? 'investigator';
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
    (localTypes[r.id] ?? '') !== (r.user_type ?? '') ||
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
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Updates <code>profiles.user_type</code> (admin, manager, investigator, seller). RLS allows
        only admins to edit roles. First admin must be set once in Supabase SQL if none exists.
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
              <TableCell>Username</TableCell>
              <TableCell>Display name</TableCell>
              <TableCell>Role (user_type)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.username || '—'}</TableCell>
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
                      value={localTypes[r.id] ?? r.user_type ?? 'investigator'}
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
