import { useState, useEffect, useMemo } from 'react';
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
  TableSortLabel,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Autocomplete,
  Grid,
  FormControlLabel,
  Switch,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { canAccessManagerFeatures, normalizeAppRole, USER_ROLES } from 'shared';

const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];

/**
 * Stable column widths for the recall table. Default `table-layout: auto` lets the
 * browser shrink text columns when another cell has a large min-width (e.g. priority
 * controls), which produces extremely tall wrapped cells and misaligned headers.
 */
function recallTableColumnSx(canPrioritize) {
  const text = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    verticalAlign: 'top',
  };
  return {
    image: { width: 56, minWidth: 56, maxWidth: 64, verticalAlign: 'middle', boxSizing: 'border-box' },
    recall_id: { width: 92, minWidth: 92, maxWidth: 110, ...text, boxSizing: 'border-box' },
    title: { width: '24%', minWidth: 160, ...text },
    product: { width: '15%', minWidth: 120, ...text },
    hazard: { width: '28%', minWidth: 180, ...text },
    assignee: {
      width: canPrioritize ? 260 : 120,
      minWidth: canPrioritize ? 260 : 120,
      maxWidth: canPrioritize ? 260 : 120,
      verticalAlign: 'middle',
      boxSizing: 'border-box',
    },
    priority: {
      width: canPrioritize ? 228 : 108,
      minWidth: canPrioritize ? 228 : 108,
      maxWidth: canPrioritize ? 228 : 108,
      verticalAlign: 'middle',
      boxSizing: 'border-box',
    },
    prioritized_at: {
      width: 128,
      minWidth: 128,
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
      boxSizing: 'border-box',
    },
  };
}

/** Product/recall thumbnail — live URL from DB with lazy load and fallback icon. */
function RecallThumb({ url, title }) {
  const [broken, setBroken] = useState(false);
  const src = url?.trim() && !broken ? url.trim() : undefined;
  return (
    <Avatar
      variant="rounded"
      src={src}
      alt={title ? `${title} — product image` : 'Product image'}
      sx={{ width: 48, height: 48, bgcolor: 'action.hover' }}
      imgProps={{
        loading: 'lazy',
        onError: () => setBroken(true),
      }}
    >
      <Inventory2Icon fontSize="small" sx={{ color: 'text.secondary' }} aria-hidden />
    </Avatar>
  );
}

/**
 * Recalls page — Sprint 1: prioritize recalls, manager-only API for writes.
 */
export default function RecallsPage() {
  const { session, profile, user } = useAuth();
  const role = normalizeAppRole(
    profile,
    user?.user_metadata?.role ?? user?.app_metadata?.role,
  );
  const canPrioritize = canAccessManagerFeatures(role);
  const isInvestigator = role === USER_ROLES.INVESTIGATOR;
  const recallColSx = recallTableColumnSx(canPrioritize);

  const [recalls, setRecalls] = useState([]);
  const [prioritizations, setPrioritizations] = useState({});
  const [prioritizationList, setPrioritizationList] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [assignmentList, setAssignmentList] = useState([]);
  const [investigators, setInvestigators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecallId, setSelectedRecallId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  /** Per-row priority dropdown overrides (recall_number string key). */
  const [rowPriorityDraft, setRowPriorityDraft] = useState({});
  const [rowSavingRecallId, setRowSavingRecallId] = useState(null);
  const [rowAssigneeDraft, setRowAssigneeDraft] = useState({});
  const [rowSavingAssigneeRecallId, setRowSavingAssigneeRecallId] = useState(null);
  const [recallIdFilter, setRecallIdFilter] = useState('');
  const [prioritizedOnly, setPrioritizedOnly] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecall, setDetailRecall] = useState(null);
  const [detailPriorityDraft, setDetailPriorityDraft] = useState('');
  const [detailAssigneeDraft, setDetailAssigneeDraft] = useState('');
  const [detailSavingMeta, setDetailSavingMeta] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDraft, setDetailDraft] = useState({
    title: '',
    product: '',
    hazard: '',
    image_url: '',
  });
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailDeleting, setDetailDeleting] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailSuccess, setDetailSuccess] = useState(null);

  useEffect(() => {
    if (!detailOpen) return;
    const recallNumber = String(detailRecall?.recall_id ?? '').trim();
    if (!recallNumber) return;

    const initialRecall = detailRecall;
    const initialDraftFromRecall = {
      title: initialRecall?.title ?? '',
      product: initialRecall?.product ?? '',
      hazard: initialRecall?.hazard ?? '',
      image_url: initialRecall?.image_url ?? '',
    };

    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      setDetailLoading(true);
      try {
        const res = await apiFetch(
          `/api/recalls/${encodeURIComponent(recallNumber)}`,
          session,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, 'Failed to load recall details'));
        }
        const detail = await res.json();
        if (cancelled) return;
        setDetailRecall(detail);
        setDetailDraft((prev) => {
          if (
            prev.title !== initialDraftFromRecall.title ||
            prev.product !== initialDraftFromRecall.product ||
            prev.hazard !== initialDraftFromRecall.hazard ||
            prev.image_url !== initialDraftFromRecall.image_url
          ) {
            return prev;
          }
          return {
            title: detail?.title ?? '',
            product: detail?.product ?? '',
            hazard: detail?.hazard ?? '',
            image_url: detail?.image_url ?? '',
          };
        });
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'AbortError') return;
        setDetailError(err.message || 'Failed to load recall details');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [detailOpen, detailRecall?.recall_id, session]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [recallsRes, priorRes, assignRes] = await Promise.all([
          apiFetch('/api/recalls', session),
          apiFetch('/api/prioritizations', session),
          apiFetch('/api/assignments', session),
        ]);
        if (!recallsRes.ok) {
          throw new Error(await getApiErrorMessage(recallsRes, 'Failed to load recalls'));
        }
        if (!priorRes.ok) {
          throw new Error(await getApiErrorMessage(priorRes, 'Failed to load prioritizations'));
        }
        if (!assignRes.ok) {
          throw new Error(await getApiErrorMessage(assignRes, 'Failed to load assignments'));
        }
        const recallsData = await recallsRes.json();
        const priorData = await priorRes.json();
        const assignData = await assignRes.json();
        setRecalls(recallsData);
        setPrioritizationList(priorData);
        const priorMap = {};
        priorData.forEach((p) => {
          priorMap[p.recall_id] = p;
        });
        setPrioritizations(priorMap);

        setAssignmentList(assignData);
        const assignMap = {};
        assignData.forEach((a) => {
          assignMap[a.recall_id] = a;
        });
        setAssignments(assignMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [session]);

  useEffect(() => {
    if (!canPrioritize) return;
    async function fetchInvestigators() {
      try {
        const res = await apiFetch('/api/users?role=investigator', session);
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, 'Failed to load investigators'));
        }
        const data = await res.json();
        setInvestigators(Array.isArray(data) ? data : []);
      } catch (err) {
        setInvestigators([]);
        console.warn(err);
      }
    }
    fetchInvestigators();
  }, [canPrioritize, session]);

  const savePrioritization = async (recallId, priority, { fromForm = false } = {}) => {
    const rid = String(recallId ?? '').trim();
    if (!rid) {
      setSubmitError('Recall ID is required');
      return;
    }
    if (!priority) {
      setSubmitError('Priority level is required');
      return;
    }
    setSubmitError(null);
    setSubmitSuccess(null);
    if (fromForm) setSubmitLoading(true);
    else setRowSavingRecallId(rid);
    try {
      const res = await apiFetch('/api/prioritizations', session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: rid, priority }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(
          data.error || (await getApiErrorMessage(res, 'Failed to save prioritization'))
        );
        return;
      }
      setPrioritizations((prev) => ({
        ...prev,
        [data.recall_id]: data,
      }));
      setPrioritizationList((prev) => {
        const idx = prev.findIndex((p) => p.recall_id === data.recall_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data;
          return next;
        }
        return [...prev, data];
      });
      setSubmitSuccess(`Recall ${data.recall_id} set to ${data.priority} priority.`);
      setRowPriorityDraft((prev) => {
        const next = { ...prev };
        delete next[data.recall_id];
        return next;
      });
      if (fromForm) {
        setSelectedRecallId('');
        setSelectedPriority('');
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to save prioritization');
    } finally {
      if (fromForm) setSubmitLoading(false);
      else setRowSavingRecallId(null);
    }
  };

  const saveAssignment = async (recallId, investigatorUserId) => {
    const rid = String(recallId ?? '').trim();
    if (!rid) {
      setSubmitError('Recall ID is required');
      return;
    }
    const invId = Number.parseInt(String(investigatorUserId ?? ''), 10);
    if (!Number.isFinite(invId) || invId < 1) {
      setSubmitError('Investigator is required');
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    setRowSavingAssigneeRecallId(rid);
    try {
      const res = await apiFetch('/api/assignments', session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: rid, investigator_user_id: invId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(
          data.error || (await getApiErrorMessage(res, 'Failed to save assignment'))
        );
        return;
      }

      setAssignments((prev) => ({ ...prev, [data.recall_id]: data }));
      setAssignmentList((prev) => {
        const idx = prev.findIndex((a) => a.recall_id === data.recall_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data;
          return next;
        }
        return [...prev, data];
      });

      setSubmitSuccess(`Recall ${data.recall_id} assigned.`);
      setRowAssigneeDraft((prev) => {
        const next = { ...prev };
        delete next[data.recall_id];
        return next;
      });
    } catch (err) {
      setSubmitError(err.message || 'Failed to save assignment');
    } finally {
      setRowSavingAssigneeRecallId(null);
    }
  };

  const handlePrioritize = (e) => {
    e.preventDefault();
    const rid = selectedRecallId;
    const assignId = selectedAssignee;
    void (async () => {
      await savePrioritization(rid, selectedPriority, { fromForm: true });
      if (assignId) {
        await saveAssignment(rid, assignId);
      }
    })();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'error';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

  const filteredRecalls = useMemo(() => {
    let list = recalls;
    if (isInvestigator) {
      const uid = Number.parseInt(String(user?.id ?? ''), 10);
      if (Number.isFinite(uid)) {
        list = list.filter((r) => assignments[r.recall_id]?.investigator_user_id === uid);
      } else {
        list = [];
      }
    }
    const q = recallIdFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.recall_id.toLowerCase().includes(q) ||
          (r.title ?? '').toLowerCase().includes(q) ||
          (r.product ?? '').toLowerCase().includes(q) ||
          (r.hazard ?? '').toLowerCase().includes(q),
      );
    }
    if (prioritizedOnly) {
      list = list.filter((r) => prioritizations[r.recall_id]);
    }
    if (sortField) {
      list = [...list].sort((a, b) => {
        let aVal, bVal;
        if (sortField === 'priority') {
          const ap = prioritizations[a.recall_id]?.priority;
          const bp = prioritizations[b.recall_id]?.priority;
          aVal = ap != null ? (PRIORITY_ORDER[ap] ?? 3) : 4;
          bVal = bp != null ? (PRIORITY_ORDER[bp] ?? 3) : 4;
        } else if (sortField === 'prioritized_at') {
          aVal = prioritizations[a.recall_id]?.prioritized_at ?? '';
          bVal = prioritizations[b.recall_id]?.prioritized_at ?? '';
        } else {
          aVal = (a[sortField] ?? '').toLowerCase();
          bVal = (b[sortField] ?? '').toLowerCase();
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [
    recalls,
    assignments,
    isInvestigator,
    recallIdFilter,
    prioritizedOnly,
    prioritizations,
    sortField,
    sortDir,
    user?.id,
  ]);

  const openDetail = (recall) => {
    setDetailRecall(recall);
    const rid = recall?.recall_id;
    const prior = rid ? prioritizations[rid] : null;
    const assign = rid ? assignments[rid] : null;
    setDetailPriorityDraft(prior?.priority ?? '');
    setDetailAssigneeDraft(assign?.investigator_user_id ?? '');
    setDetailDraft({
      title: recall?.title ?? '',
      product: recall?.product ?? '',
      hazard: recall?.hazard ?? '',
      image_url: recall?.image_url ?? '',
    });
    setDetailError(null);
    setDetailSuccess(null);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    if (detailSaving || detailDeleting) return;
    setDetailOpen(false);
    setDetailLoading(false);
  };

  const saveDetail = async () => {
    if (!detailRecall) return;
    setDetailSaving(true);
    setDetailError(null);
    setDetailSuccess(null);
    try {
      const res = await apiFetch(`/api/recalls/${detailRecall.recall_id}`, session, {
        method: 'PATCH',
        body: JSON.stringify(detailDraft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailError(
          data.error || (await getApiErrorMessage(res, 'Failed to update recall'))
        );
        return;
      }
      setRecalls((prev) => prev.map((r) => (r.recall_id === data.recall_id ? data : r)));
      setDetailRecall(data);
      setDetailSuccess('Saved.');
    } catch (err) {
      setDetailError(err.message || 'Failed to update recall');
    } finally {
      setDetailSaving(false);
    }
  };

  const saveDetailPriority = async () => {
    if (!detailRecall) return;
    const rid = String(detailRecall.recall_id ?? '').trim();
    if (!rid) return;
    if (!detailPriorityDraft) {
      setDetailError('Priority level is required');
      return;
    }
    setDetailSavingMeta(true);
    setDetailError(null);
    setDetailSuccess(null);
    try {
      const res = await apiFetch('/api/prioritizations', session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: rid, priority: detailPriorityDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailError(
          data.error || (await getApiErrorMessage(res, 'Failed to save prioritization')),
        );
        return;
      }
      setPrioritizations((prev) => ({ ...prev, [data.recall_id]: data }));
      setPrioritizationList((prev) => {
        const idx = prev.findIndex((p) => p.recall_id === data.recall_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data;
          return next;
        }
        return [...prev, data];
      });
      setDetailSuccess('Priority saved.');
    } catch (err) {
      setDetailError(err.message || 'Failed to save prioritization');
    } finally {
      setDetailSavingMeta(false);
    }
  };

  const saveDetailAssignee = async () => {
    if (!detailRecall) return;
    const rid = String(detailRecall.recall_id ?? '').trim();
    if (!rid) return;
    const invId = Number.parseInt(String(detailAssigneeDraft ?? ''), 10);
    if (!Number.isFinite(invId) || invId < 1) {
      setDetailError('Assignee investigator is required');
      return;
    }
    setDetailSavingMeta(true);
    setDetailError(null);
    setDetailSuccess(null);
    try {
      const res = await apiFetch('/api/assignments', session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: rid, investigator_user_id: invId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailError(data.error || (await getApiErrorMessage(res, 'Failed to save assignment')));
        return;
      }

      setAssignments((prev) => ({ ...prev, [data.recall_id]: data }));
      setAssignmentList((prev) => {
        const idx = prev.findIndex((a) => a.recall_id === data.recall_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data;
          return next;
        }
        return [...prev, data];
      });

      setDetailSuccess('Assignee saved.');
    } catch (err) {
      setDetailError(err.message || 'Failed to save assignment');
    } finally {
      setDetailSavingMeta(false);
    }
  };

  const deleteDetail = async () => {
    if (!detailRecall) return;
    const ok = window.confirm(`Delete recall ${detailRecall.recall_id}? This cannot be undone.`);
    if (!ok) return;
    setDetailDeleting(true);
    setDetailError(null);
    setDetailSuccess(null);
    try {
      const res = await apiFetch(`/api/recalls/${detailRecall.recall_id}`, session, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailError(
          data.error || (await getApiErrorMessage(res, 'Failed to delete recall'))
        );
        return;
      }
      if (!data?.success) {
        setDetailError('Delete failed');
        return;
      }
      setRecalls((prev) => prev.filter((r) => r.recall_id !== detailRecall.recall_id));
      setDetailOpen(false);
    } catch (err) {
      setDetailError(err.message || 'Failed to delete recall');
    } finally {
      setDetailDeleting(false);
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
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Recalls
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Recalls
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {canPrioritize
          ? 'Prioritize recalls and assign investigators (Sprint 1).'
          : isInvestigator
            ? 'View recalls assigned to you. Only CPSC Managers and Admins can change priority or assignments.'
            : 'View recalls and priority assignments. Only CPSC Managers and Admins can change priority or assignments.'}
      </Typography>

      <Box sx={{ pt: 1 }}>
        {canPrioritize && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Prioritize Recall
            </Typography>
            <Box
              component="form"
              onSubmit={handlePrioritize}
              display="flex"
              flexDirection="column"
              gap={2}
              maxWidth={{ xs: '100%', sm: 400 }}
            >
              <Autocomplete
                options={recalls}
                disabled={rowSavingRecallId != null}
                getOptionLabel={(r) => `${r.recall_id} — ${r.title}`}
                value={recalls.find((r) => r.recall_id === selectedRecallId) ?? null}
                onChange={(_, value) => {
                  setSelectedRecallId(value?.recall_id ?? '');
                  setSelectedAssignee('');
                  setSelectedPriority('');
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Recall ID" placeholder="Select a recall" required />
                )}
              />
              <FormControl fullWidth disabled={rowSavingRecallId != null}>
                <InputLabel>Assignee (Investigator)</InputLabel>
                <Select
                  value={selectedAssignee}
                  label="Assignee (Investigator)"
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  disabled={investigators.length === 0 || rowSavingRecallId != null}
                >
                  <MenuItem value="">
                    <em>Unassigned</em>
                  </MenuItem>
                  {investigators.map((u) => (
                    <MenuItem key={u.id} value={Number.parseInt(String(u.id), 10)}>
                      {u.full_name || u.email || `User ${u.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required disabled={rowSavingRecallId != null}>
                <InputLabel>Priority Level</InputLabel>
                <Select
                  value={selectedPriority}
                  label="Priority Level"
                  onChange={(e) => setSelectedPriority(e.target.value)}
                >
                  {PRIORITY_LEVELS.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                type="submit"
                variant="contained"
                disabled={submitLoading || rowSavingRecallId != null}
              >
                {submitLoading ? <CircularProgress size={24} /> : 'Assign Priority'}
              </Button>
              {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}
              {submitError && <Alert severity="error">{submitError}</Alert>}
            </Box>
          </Paper>
        )}

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recall List
          </Typography>
          <Box
            display="flex"
            flexWrap="wrap"
            gap={2}
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <TextField
              size="small"
              label="Search"
              placeholder="ID, title, product, or hazard"
              value={recallIdFilter}
              onChange={(e) => setRecallIdFilter(e.target.value)}
              sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' }, minWidth: { xs: '100%', sm: 280 } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={prioritizedOnly}
                  onChange={(e) => setPrioritizedOnly(e.target.checked)}
                />
              }
              label="Show prioritized only"
            />
          </Box>
          <TableContainer
            sx={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%',
              scrollbarGutter: 'stable',
            }}
          >
            <Table
              size="small"
              sx={{
                tableLayout: 'fixed',
                width: '100%',
                minWidth: { xs: 920, md: 1160 },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={recallColSx.image}>
                    <strong>Image</strong>
                  </TableCell>
                  {[
                    { id: 'recall_id', label: 'Recall ID' },
                    { id: 'title', label: 'Title' },
                    { id: 'product', label: 'Product' },
                    { id: 'hazard', label: 'Hazard' },
                    { id: 'assignee', label: 'Assignee' },
                    { id: 'priority', label: 'Priority' },
                    { id: 'prioritized_at', label: 'Prioritized At' },
                  ].map((col) => (
                    <TableCell
                      key={col.id}
                      sortDirection={sortField === col.id ? sortDir : false}
                      sx={recallColSx[col.id]}
                    >
                      <TableSortLabel
                        active={sortField === col.id}
                        direction={sortField === col.id ? sortDir : 'asc'}
                        onClick={() => handleSort(col.id)}
                      >
                        <strong>{col.label}</strong>
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecalls.map((recall) => {
                  const prior = prioritizations[recall.recall_id];
                  const rowPriority =
                    rowPriorityDraft[recall.recall_id] ?? prior?.priority ?? '';
                  const rowSaving = rowSavingRecallId === recall.recall_id;
                  const a = assignments[recall.recall_id];
                  const rowAssignee =
                    rowAssigneeDraft[recall.recall_id] ?? a?.investigator_user_id ?? '';
                  const rowSavingAssignee =
                    rowSavingAssigneeRecallId === recall.recall_id;
                  return (
                    <TableRow
                      key={recall.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openDetail(recall)}
                    >
                      <TableCell sx={recallColSx.image}>
                        <RecallThumb url={recall.image_url} title={recall.title} />
                      </TableCell>
                      <TableCell sx={recallColSx.recall_id}>{recall.recall_id}</TableCell>
                      <TableCell sx={recallColSx.title}>{recall.title}</TableCell>
                      <TableCell sx={recallColSx.product}>{recall.product}</TableCell>
                      <TableCell sx={recallColSx.hazard}>{recall.hazard}</TableCell>
                      <TableCell sx={recallColSx.assignee}>
                        {canPrioritize ? (
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            flexWrap="wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FormControl size="small" sx={{ minWidth: 180, flex: '1 1 auto' }}>
                              <Select
                                value={rowAssignee}
                                displayEmpty
                                disabled={rowSavingAssignee || investigators.length === 0}
                                inputProps={{ 'aria-label': 'Assignee' }}
                                onChange={(e) =>
                                  setRowAssigneeDraft((prev) => ({
                                    ...prev,
                                    [recall.recall_id]: e.target.value,
                                  }))
                                }
                              >
                                <MenuItem value="" sx={{ color: 'text.secondary' }}>
                                  <em>Select investigator</em>
                                </MenuItem>
                                {investigators.map((u) => (
                                  <MenuItem
                                    key={u.id}
                                    value={Number.parseInt(String(u.id), 10)}
                                  >
                                    {u.full_name || u.email || `User ${u.id}`}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={rowSavingAssignee || !rowAssignee || submitLoading}
                              onClick={() => void saveAssignment(recall.recall_id, rowAssignee)}
                            >
                              {rowSavingAssignee ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </Box>
                        ) : a?.investigator_user_id ? (
                          <Typography variant="body2">{a.investigator_user_id}</Typography>
                        ) : (
                          <Typography color="text.secondary" variant="body2">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={recallColSx.priority}>
                        {canPrioritize ? (
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            flexWrap="wrap"
                            sx={{ maxWidth: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FormControl size="small" sx={{ minWidth: 120, flex: '1 1 auto' }}>
                              <Select
                                id={`priority-select-${recall.id}`}
                                value={rowPriority}
                                displayEmpty
                                disabled={rowSaving}
                                inputProps={{ 'aria-label': 'Priority' }}
                                onChange={(e) =>
                                  setRowPriorityDraft((prev) => ({
                                    ...prev,
                                    [recall.recall_id]: e.target.value,
                                  }))
                                }
                              >
                                <MenuItem value="" sx={{ color: 'text.secondary' }}>
                                  <em>Select priority</em>
                                </MenuItem>
                                {PRIORITY_LEVELS.map((p) => (
                                  <MenuItem key={p} value={p}>
                                    {p}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={rowSaving || !rowPriority || submitLoading}
                              onClick={() =>
                                void savePrioritization(recall.recall_id, rowPriority, {
                                  fromForm: false,
                                })
                              }
                            >
                              {rowSaving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
                            </Button>
                          </Box>
                        ) : prior ? (
                          <Chip
                            label={prior.priority}
                            color={getPriorityColor(prior.priority)}
                            size="small"
                          />
                        ) : (
                          <Typography color="text.secondary" variant="body2">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={recallColSx.prioritized_at}>
                        {prior?.prioritized_at
                          ? new Date(prior.prioritized_at).toLocaleString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredRecalls.length === 0 && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              No recalls match your filters.
            </Typography>
          )}
        </Paper>
      </Box>

      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="md">
        <DialogTitle>
          {detailRecall ? `Recall ${detailRecall.recall_id}` : 'Recall'}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading && (
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Loading recall details…
              </Typography>
            </Box>
          )}
          {detailError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDetailError(null)}>
              {detailError}
            </Alert>
          )}
          {detailSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDetailSuccess(null)}>
              {detailSuccess}
            </Alert>
          )}

          <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
            <Box sx={{ width: 120 }}>
              <RecallThumb url={detailDraft.image_url} title={detailDraft.title} />
            </Box>
            <Box sx={{ flex: '1 1 360px', minWidth: 280 }}>
              <Box
                display="flex"
                gap={2}
                flexWrap="wrap"
                alignItems="center"
                sx={{ mb: 2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Box sx={{ flex: '1 1 260px', minWidth: 240 }}>
                  <FormControl fullWidth size="small" disabled={!canPrioritize || detailSavingMeta}>
                    <InputLabel>Assignee (Investigator)</InputLabel>
                    <Select
                      value={detailAssigneeDraft}
                      label="Assignee (Investigator)"
                      onChange={(e) => setDetailAssigneeDraft(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Unassigned</em>
                      </MenuItem>
                      {investigators.map((u) => (
                        <MenuItem key={u.id} value={Number.parseInt(String(u.id), 10)}>
                          {u.full_name || u.email || `User ${u.id}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                {canPrioritize && (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={detailSavingMeta || !detailAssigneeDraft}
                    onClick={() => void saveDetailAssignee()}
                  >
                    Save assignee
                  </Button>
                )}
                <Box sx={{ flex: '1 1 220px', minWidth: 200 }}>
                  <FormControl fullWidth size="small" disabled={!canPrioritize || detailSavingMeta}>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={detailPriorityDraft}
                      label="Priority"
                      onChange={(e) => setDetailPriorityDraft(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Unprioritized</em>
                      </MenuItem>
                      {PRIORITY_LEVELS.map((p) => (
                        <MenuItem key={p} value={p}>
                          {p}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                {canPrioritize && (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={detailSavingMeta || !detailPriorityDraft}
                    onClick={() => void saveDetailPriority()}
                  >
                    Save priority
                  </Button>
                )}
              </Box>
              <TextField
                fullWidth
                label="Title"
                value={detailDraft.title}
                onChange={(e) => setDetailDraft((p) => ({ ...p, title: e.target.value }))}
                disabled={!canPrioritize || detailSaving || detailDeleting}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Product"
                value={detailDraft.product}
                onChange={(e) => setDetailDraft((p) => ({ ...p, product: e.target.value }))}
                disabled={!canPrioritize || detailSaving || detailDeleting}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Hazard"
                value={detailDraft.hazard}
                onChange={(e) => setDetailDraft((p) => ({ ...p, hazard: e.target.value }))}
                disabled={!canPrioritize || detailSaving || detailDeleting}
                multiline
                minRows={2}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Image URL"
                value={detailDraft.image_url}
                onChange={(e) => setDetailDraft((p) => ({ ...p, image_url: e.target.value }))}
                disabled={!canPrioritize || detailSaving || detailDeleting}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Managers/Admins can edit and delete; investigators have read-only view.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail} disabled={detailSaving || detailDeleting}>
            Close
          </Button>
          {canPrioritize && (
            <>
              <Button
                color="error"
                onClick={deleteDetail}
                disabled={detailSaving || detailDeleting}
              >
                {detailDeleting ? 'Deleting…' : 'Delete'}
              </Button>
              <Button
                variant="contained"
                onClick={saveDetail}
                disabled={detailSaving || detailDeleting}
              >
                {detailSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
