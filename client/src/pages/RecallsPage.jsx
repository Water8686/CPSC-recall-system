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
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Tabs,
  Tab,
  Grid,
  Avatar,
  FormControlLabel,
  Switch,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { canAccessManagerFeatures, normalizeAppRole, USER_ROLES } from 'shared';
import { PRIORITY_LEVELS, getPriorityBgColor, getPriorityColor } from '../constants/priorities';

function normalizeOptionalText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  return String(value);
}

function isValueEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

function formatMaybeDate(value) {
  if (isValueEmpty(value)) return '';
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return normalizeOptionalText(value);
  return dt.toLocaleDateString();
}

/** Product/recall thumbnail — live URL from DB with lazy load and fallback icon. */
function RecallThumb({ url, title, size = 48 }) {
  const [broken, setBroken] = useState(false);
  const src = url?.trim() && !broken ? url.trim() : undefined;
  return (
    <Avatar
      variant="rounded"
      src={src}
      alt={title ? `${title} — product image` : 'Product image'}
      sx={{ width: size, height: size, bgcolor: 'action.hover' }}
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
 * Card for a single recall in the Prioritize Recalls tab.
 */
function RecallCard({
  recall,
  prior,
  selected,
  onToggle,
  onViewDetails,
  onEditPriority,
  canPrioritize,
}) {
  const priority = prior?.priority;
  const priorityColors = priority ? getPriorityBgColor(priority) : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 1,
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'primary.50' : 'background.paper',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:hover': selected ? {} : { borderColor: 'grey.400' },
      }}
    >
      <Box display="flex" alignItems="flex-start" gap={1}>
        {canPrioritize && (
          <Checkbox
            checked={selected}
            onChange={onToggle}
            sx={{ mt: 0.25, p: 0.5 }}
          />
        )}
        <Box flex={1} minWidth={0}>
          {/* Header row */}
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={0.5}>
            <Box minWidth={0} flex={1}>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="body1" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                  {recall.title || recall.recall_id}
                </Typography>
                {priority && priorityColors && (
                  <Chip
                    label={`${priority} Priority`}
                    size="small"
                    variant="outlined"
                    sx={{
                      bgcolor: priorityColors.bgcolor,
                      color: priorityColors.color,
                      borderColor: priorityColors.borderColor,
                      fontWeight: 500,
                      height: 20,
                      fontSize: '0.7rem',
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                <strong>Recall ID:</strong> {recall.recall_id}
                {recall.recall_date && <> &nbsp;·&nbsp; <strong>Date Issued:</strong> {formatMaybeDate(recall.recall_date)}</>}
              </Typography>
            </Box>
            {canPrioritize && (
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => { e.stopPropagation(); onEditPriority(recall, prior); }}
                sx={{ ml: 1.5, flexShrink: 0, fontSize: '0.7rem', py: 0.25, px: 1 }}
              >
                Edit Priority
              </Button>
            )}
          </Box>

          {/* Details row */}
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              px: 1,
              py: 0.75,
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 0.75,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Manufacturer</Typography>
              <Typography variant="caption" fontWeight={500}>{recall.manufacturer || '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Product</Typography>
              <Typography variant="caption" fontWeight={500}>{recall.product || '—'}</Typography>
            </Box>
            <Box flex={1} minWidth={120}>
              <Typography variant="caption" color="text.secondary" display="block">Hazard Type</Typography>
              <Typography variant="caption" fontWeight={500} color="error.main">{recall.hazard || '—'}</Typography>
            </Box>
          </Box>

          {/* Action buttons */}
          <Box display="flex" gap={1}>
            <Button variant="outlined" size="small" onClick={(e) => { e.stopPropagation(); onViewDetails(recall); }}
              sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
            >
              View Full Recall Details
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

/**
 * Stable column widths for the recall table (investigator view).
 */
function recallTableColumnSx() {
  const text = { wordBreak: 'break-word', overflowWrap: 'anywhere', verticalAlign: 'top' };
  return {
    image: { width: 56, minWidth: 56, maxWidth: 64, verticalAlign: 'middle', boxSizing: 'border-box' },
    recall_id: { width: 92, minWidth: 92, maxWidth: 110, ...text, boxSizing: 'border-box' },
    title: { width: '24%', minWidth: 160, ...text },
    product: { width: '15%', minWidth: 120, ...text },
    hazard: { width: '28%', minWidth: 180, ...text },
    assignee: { width: 120, minWidth: 120, maxWidth: 120, verticalAlign: 'middle', boxSizing: 'border-box' },
    priority: { width: 108, minWidth: 108, maxWidth: 108, verticalAlign: 'middle', boxSizing: 'border-box' },
    prioritized_at: { width: 128, minWidth: 128, whiteSpace: 'nowrap', verticalAlign: 'top', boxSizing: 'border-box' },
  };
}

const recallDetailGroups = [
  {
    title: 'Dates',
    fields: [
      { key: 'recall_date', label: 'Recall date', format: formatMaybeDate },
      { key: 'last_publish_date', label: 'Last publish date', format: formatMaybeDate },
    ],
  },
  {
    title: 'Links & contact',
    fields: [
      { key: 'recall_url', label: 'Recall URL' },
      { key: 'consumer_contact', label: 'Consumer contact' },
    ],
  },
  {
    title: 'Description',
    fields: [{ key: 'recall_description', label: 'Recall description', kind: 'multiline' }],
  },
  {
    title: 'Hazard & injury',
    fields: [
      { key: 'hazard', label: 'Hazard', source: 'draft' },
      { key: 'injury', label: 'Injury' },
    ],
  },
  {
    title: 'Remedy',
    fields: [
      { key: 'remedy', label: 'Remedy' },
      { key: 'remedy_option', label: 'Remedy option' },
    ],
  },
  {
    title: 'Company chain',
    fields: [
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'manufacturer_country', label: 'Manufacturer country' },
      { key: 'importer', label: 'Importer' },
      { key: 'distributor', label: 'Distributor' },
      { key: 'retailer', label: 'Retailer' },
    ],
  },
  {
    title: 'Product metadata',
    fields: [
      { key: 'product_name', label: 'Product name' },
      { key: 'product_type', label: 'Product type' },
      { key: 'upc', label: 'UPC' },
      { key: 'number_of_units', label: 'Number of units' },
    ],
  },
];

function renderDetailRow({ label, value, kind, isLink }) {
  if (isValueEmpty(value)) return null;
  if (kind === 'multiline') {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={4}
          value={normalizeOptionalText(value)}
          InputProps={{ readOnly: true }}
          sx={{ '& .MuiInputBase-root': { maxHeight: 240, overflow: 'auto' } }}
        />
      </Box>
    );
  }
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {isLink ? (
          <a href={normalizeOptionalText(value)} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
            {normalizeOptionalText(value)}
          </a>
        ) : (
          normalizeOptionalText(value)
        )}
      </Typography>
    </Box>
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
  const recallColSx = recallTableColumnSx();

  const [recalls, setRecalls] = useState([]);
  const [prioritizations, setPrioritizations] = useState({});
  const [prioritizationList, setPrioritizationList] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [assignmentList, setAssignmentList] = useState([]);
  const [investigators, setInvestigators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab state (manager view only)
  const [activeTab, setActiveTab] = useState(0);

  // Multi-select state
  const [selectedRecallIds, setSelectedRecallIds] = useState(new Set());

  // Review screen state
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewPriorities, setReviewPriorities] = useState({});
  const [reviewInvestigator, setReviewInvestigator] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Edit Priority dialog (per-card)
  const [editPriorityOpen, setEditPriorityOpen] = useState(false);
  const [editPriorityRecall, setEditPriorityRecall] = useState(null);
  const [editPriorityValue, setEditPriorityValue] = useState('');
  const [editPrioritySaving, setEditPrioritySaving] = useState(false);
  const [editPriorityError, setEditPriorityError] = useState(null);

  // Global status messages
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Search/filter
  const [recallIdFilter, setRecallIdFilter] = useState('');
  const [showAssigned, setShowAssigned] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecall, setDetailRecall] = useState(null);
  const [detailPriorityDraft, setDetailPriorityDraft] = useState('');
  const [detailAssigneeDraft, setDetailAssigneeDraft] = useState('');
  const [detailSavingMeta, setDetailSavingMeta] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailDraft, setDetailDraft] = useState({ title: '', product: '', hazard: '', image_url: '' });
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailDeleting, setDetailDeleting] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
        if (!recallsRes.ok) throw new Error(await getApiErrorMessage(recallsRes, 'Failed to load recalls'));
        if (!priorRes.ok) throw new Error(await getApiErrorMessage(priorRes, 'Failed to load prioritizations'));
        if (!assignRes.ok) throw new Error(await getApiErrorMessage(assignRes, 'Failed to load assignments'));

        const recallsData = await recallsRes.json();
        const priorData = await priorRes.json();
        const assignData = await assignRes.json();

        setRecalls(recallsData);
        setPrioritizationList(priorData);
        const priorMap = {};
        priorData.forEach((p) => { priorMap[p.recall_id] = p; });
        setPrioritizations(priorMap);

        setAssignmentList(assignData);
        const assignMap = {};
        assignData.forEach((a) => { assignMap[a.recall_id] = a; });
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
        if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Failed to load investigators'));
        const data = await res.json();
        setInvestigators(Array.isArray(data) ? data : []);
      } catch (err) {
        setInvestigators([]);
        console.warn(err);
      }
    }
    fetchInvestigators();
  }, [canPrioritize, session]);

  // --- Handlers ---

  const savePrioritization = async (recallId, priority) => {
    const rid = String(recallId ?? '').trim();
    if (!rid || !priority) return false;
    try {
      const res = await apiFetch('/api/prioritizations', session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: rid, priority }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save prioritization');
      }
      setPrioritizations((prev) => ({ ...prev, [data.recall_id]: data }));
      setPrioritizationList((prev) => {
        const idx = prev.findIndex((p) => p.recall_id === data.recall_id);
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
        return [...prev, data];
      });
      return true;
    } catch (err) {
      throw err;
    }
  };

  const saveAssignment = async (recallId, investigatorUserId) => {
    const rid = String(recallId ?? '').trim();
    const invId = Number.parseInt(String(investigatorUserId ?? ''), 10);
    if (!rid || !Number.isFinite(invId) || invId < 1) return false;
    try {
      const res = await apiFetch('/api/assignments', session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: rid, investigator_user_id: invId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save assignment');
      setAssignments((prev) => ({ ...prev, [data.recall_id]: data }));
      setAssignmentList((prev) => {
        const idx = prev.findIndex((a) => a.recall_id === data.recall_id);
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
        return [...prev, data];
      });
      return true;
    } catch (err) {
      throw err;
    }
  };

  const handleToggleRecall = (recallId) => {
    setSelectedRecallIds((prev) => {
      const next = new Set(prev);
      if (next.has(recallId)) next.delete(recallId);
      else next.add(recallId);
      return next;
    });
  };

  const enterReviewMode = () => {
    // Pre-populate priorities from any existing prioritizations
    const initial = {};
    for (const rid of selectedRecallIds) {
      initial[rid] = prioritizations[rid]?.priority ?? '';
    }
    setReviewPriorities(initial);
    setReviewInvestigator('');
    setReviewError(null);
    setReviewMode(true);
  };

  const handleConfirmReview = async () => {
    const ids = Array.from(selectedRecallIds);
    const missing = ids.filter((rid) => !reviewPriorities[rid]);
    if (missing.length > 0) {
      setReviewError(`Please set a priority for all ${missing.length} recall${missing.length !== 1 ? 's' : ''}.`);
      return;
    }
    const invId = Number.parseInt(String(reviewInvestigator ?? ''), 10);
    if (!Number.isFinite(invId) || invId < 1) {
      setReviewError('Please select an investigator.');
      return;
    }
    setReviewSaving(true);
    setReviewError(null);
    try {
      await Promise.all(ids.map((rid) => savePrioritization(rid, reviewPriorities[rid])));
      await Promise.all(ids.map((rid) => saveAssignment(rid, invId)));
      const inv = investigators.find((u) => Number.parseInt(String(u.id), 10) === invId);
      const invName = inv?.full_name || inv?.email || `Investigator ${invId}`;
      setSubmitSuccess(`${ids.length} recall${ids.length !== 1 ? 's' : ''} prioritized and assigned to ${invName}.`);
      setSelectedRecallIds(new Set());
      setReviewMode(false);
    } catch (err) {
      setReviewError(err.message || 'Failed to save');
    } finally {
      setReviewSaving(false);
    }
  };

  const openEditPriority = (recall, prior) => {
    setEditPriorityRecall(recall);
    setEditPriorityValue(prior?.priority ?? '');
    setEditPriorityError(null);
    setEditPriorityOpen(true);
  };

  const handleSaveEditPriority = async () => {
    if (!editPriorityRecall || !editPriorityValue) {
      setEditPriorityError('Please select a priority level');
      return;
    }
    setEditPrioritySaving(true);
    setEditPriorityError(null);
    try {
      await savePrioritization(editPriorityRecall.recall_id, editPriorityValue);
      setSubmitSuccess(`Priority updated for ${editPriorityRecall.recall_id}.`);
      setEditPriorityOpen(false);
    } catch (err) {
      setEditPriorityError(err.message || 'Failed to update priority');
    } finally {
      setEditPrioritySaving(false);
    }
  };

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
        setDetailError(data.error || (await getApiErrorMessage(res, 'Failed to update recall')));
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
    if (!rid || !detailPriorityDraft) {
      setDetailError('Priority level is required');
      return;
    }
    setDetailSavingMeta(true);
    setDetailError(null);
    setDetailSuccess(null);
    try {
      await savePrioritization(rid, detailPriorityDraft);
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
      await saveAssignment(rid, invId);
      setDetailSuccess('Assignee saved.');
    } catch (err) {
      setDetailError(err.message || 'Failed to save assignment');
    } finally {
      setDetailSavingMeta(false);
    }
  };

  const deleteDetail = async () => {
    if (!detailRecall) return;
    setDeleteConfirmOpen(false);
    setDetailDeleting(true);
    setDetailError(null);
    setDetailSuccess(null);
    try {
      const res = await apiFetch(`/api/recalls/${detailRecall.recall_id}`, session, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailError(data.error || (await getApiErrorMessage(res, 'Failed to delete recall')));
        return;
      }
      if (!data?.success) { setDetailError('Delete failed'); return; }
      setRecalls((prev) => prev.filter((r) => r.recall_id !== detailRecall.recall_id));
      setDetailOpen(false);
    } catch (err) {
      setDetailError(err.message || 'Failed to delete recall');
    } finally {
      setDetailDeleting(false);
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
    if (!showAssigned) {
      // Hide recalls that are already both prioritized and assigned — they're done
      list = list.filter(
        (r) => !(prioritizations[r.recall_id] && assignments[r.recall_id]),
      );
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
    recalls, assignments, isInvestigator, recallIdFilter, showAssigned,
    prioritizations, sortField, sortDir, user?.id,
  ]);

  // Stats for Active Investigations tab
  const investigationStats = useMemo(() => {
    const assigned = assignmentList.length;
    const prioritized = prioritizationList.length;
    return { pendingReview: prioritized - assigned, underInvestigation: assigned };
  }, [assignmentList, prioritizationList]);

  // Per-investigator assignments for Investigators tab
  const investigatorAssignments = useMemo(() => {
    return investigators.map((inv) => {
      const invId = Number.parseInt(String(inv.id), 10);
      const invAssignments = assignmentList.filter(
        (a) => a.investigator_user_id === invId,
      );
      const assignedRecalls = invAssignments
        .map((a) => {
          const recall = recalls.find((r) => r.recall_id === a.recall_id);
          const prior = prioritizations[a.recall_id];
          return recall ? { recall, prior, assignment: a } : null;
        })
        .filter(Boolean);
      return { inv, assignedRecalls };
    });
  }, [investigators, assignmentList, recalls, prioritizations]);

  const selectedCount = selectedRecallIds.size;

  // --- Render ---

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
        <Typography variant="h4" fontWeight={700} gutterBottom>Recalls</Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Investigator view — simple table of their assigned recalls
  if (isInvestigator) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>My Assigned Recalls</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          View recalls assigned to you.
        </Typography>
        <Paper sx={{ p: 3 }}>
          <TextField
            size="small"
            label="Search"
            placeholder="ID, title, product, or hazard"
            value={recallIdFilter}
            onChange={(e) => setRecallIdFilter(e.target.value)}
            sx={{ mb: 2, minWidth: 280 }}
          />
          <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell scope="col" sx={recallColSx.image}><strong>Image</strong></TableCell>
                  <TableCell scope="col" sx={recallColSx.recall_id}><strong>Recall ID</strong></TableCell>
                  <TableCell scope="col" sx={recallColSx.title}><strong>Title</strong></TableCell>
                  <TableCell scope="col" sx={recallColSx.product}><strong>Product</strong></TableCell>
                  <TableCell scope="col" sx={recallColSx.hazard}><strong>Hazard</strong></TableCell>
                  <TableCell scope="col" sx={recallColSx.priority}><strong>Priority</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecalls.map((recall) => {
                  const prior = prioritizations[recall.recall_id];
                  return (
                    <TableRow key={recall.id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(recall)}>
                      <TableCell sx={recallColSx.image}>
                        <RecallThumb url={recall.image_url} title={recall.title} />
                      </TableCell>
                      <TableCell sx={recallColSx.recall_id}>{recall.recall_id}</TableCell>
                      <TableCell sx={recallColSx.title}>{recall.title}</TableCell>
                      <TableCell sx={recallColSx.product}>{recall.product}</TableCell>
                      <TableCell sx={recallColSx.hazard}>{recall.hazard}</TableCell>
                      <TableCell sx={recallColSx.priority}>
                        {prior ? (
                          <Chip label={prior.priority} color={getPriorityColor(prior.priority)} size="small" />
                        ) : (
                          <Typography color="text.secondary" variant="body2">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredRecalls.length === 0 && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>No recalls assigned to you.</Typography>
          )}
        </Paper>

        {/* Detail dialog */}
        {renderDetailDialog()}
      </Box>
    );
  }

  // Review screen — shown when manager clicks "Review & Prioritize"
  if (reviewMode) {
    const selectedRecalls = recalls.filter((r) => selectedRecallIds.has(r.recall_id));
    const allPrioritiesSet = selectedRecalls.every((r) => reviewPriorities[r.recall_id]);
    const reviewInvId = Number.parseInt(String(reviewInvestigator ?? ''), 10);
    const canConfirm = allPrioritiesSet && Number.isFinite(reviewInvId) && reviewInvId > 0;

    return (
      <Box>
        {/* Header */}
        <Box display="flex" alignItems="flex-start" gap={2} mb={3}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => setReviewMode(false)}
            disabled={reviewSaving}
            sx={{ mt: 0.5 }}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Review & Prioritize Recalls
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set a priority for each recall, then choose an investigator to assign them all to.
            </Typography>
          </Box>
        </Box>

        {reviewError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setReviewError(null)}>
            {reviewError}
          </Alert>
        )}

        {/* Compact recall table */}
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell scope="col"><strong>Recall ID</strong></TableCell>
                  <TableCell scope="col"><strong>Product</strong></TableCell>
                  <TableCell scope="col"><strong>Hazard</strong></TableCell>
                  <TableCell scope="col" sx={{ width: 160 }}><strong>Priority</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedRecalls.map((recall) => (
                  <TableRow key={recall.recall_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{recall.recall_id}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{recall.product || recall.title || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="error.main">{recall.hazard || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth disabled={reviewSaving}>
                        <Select
                          value={reviewPriorities[recall.recall_id] ?? ''}
                          displayEmpty
                          onChange={(e) =>
                            setReviewPriorities((prev) => ({
                              ...prev,
                              [recall.recall_id]: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value=""><em>Set priority</em></MenuItem>
                          {PRIORITY_LEVELS.map((p) => (
                            <MenuItem key={p} value={p}>{p}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Investigator picker + confirm */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Assign to Investigator</Typography>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl sx={{ minWidth: 280 }} disabled={reviewSaving}>
              <InputLabel>Investigator</InputLabel>
              <Select
                value={reviewInvestigator}
                label="Investigator"
                onChange={(e) => setReviewInvestigator(e.target.value)}
              >
                <MenuItem value=""><em>Select investigator</em></MenuItem>
                {investigators.map((u) => (
                  <MenuItem key={u.id} value={Number.parseInt(String(u.id), 10)}>
                    {u.full_name || u.email || `User ${u.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box flex={1} />
            <Button onClick={() => setReviewMode(false)} disabled={reviewSaving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="large"
              disabled={!canConfirm || reviewSaving}
              onClick={handleConfirmReview}
            >
              {reviewSaving ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Assign'}
            </Button>
          </Box>
          {!allPrioritiesSet && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Set a priority for every recall before confirming.
            </Typography>
          )}
        </Paper>

        {renderDetailDialog()}
      </Box>
    );
  }

  // Manager / Admin view — tabbed layout
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        CPSC Manager Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Select high-priority recalls to monitor for online violations
      </Typography>

      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSubmitSuccess(null)}>
          {submitSuccess}
        </Alert>
      )}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Prioritize Recalls" />
        <Tab label="Active Investigations" />
        <Tab label={
          <Box display="flex" alignItems="center" gap={0.5}>
            <GroupsIcon fontSize="small" />
            Investigators
          </Box>
        } />
      </Tabs>

      {/* ── Tab 0: Prioritize Recalls ── */}
      {activeTab === 0 && (
        <>
          {/* Selection banner */}
          <Paper
            variant="outlined"
            sx={{
              p: 3, mb: 3,
              bgcolor: 'primary.50',
              borderColor: 'primary.200',
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom={false}>
                  Recalls Selected: {selectedCount} / 10
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select 1–10 recalls, then review and set priorities before assigning
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                disabled={selectedCount < 1 || selectedCount > 10}
                onClick={enterReviewMode}
              >
                Review & Prioritize
              </Button>
            </Box>
          </Paper>

          {/* Search / filter */}
          <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField
              size="small"
              label="Search"
              placeholder="ID, title, product, or hazard"
              value={recallIdFilter}
              onChange={(e) => setRecallIdFilter(e.target.value)}
              sx={{ minWidth: 280 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showAssigned}
                  onChange={(e) => setShowAssigned(e.target.checked)}
                />
              }
              label="Show assigned"
            />
            <Typography variant="body2" color="text.secondary">
              {filteredRecalls.length} recall{filteredRecalls.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {/* Recall cards */}
          {filteredRecalls.map((recall) => (
            <RecallCard
              key={recall.recall_id}
              recall={recall}
              prior={prioritizations[recall.recall_id]}
              selected={selectedRecallIds.has(recall.recall_id)}
              onToggle={() => handleToggleRecall(recall.recall_id)}
              onViewDetails={openDetail}
              onEditPriority={openEditPriority}
              canPrioritize={canPrioritize}
            />
          ))}

          {filteredRecalls.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {recallIdFilter
                  ? 'No recalls match your search.'
                  : 'All recalls have been prioritized and assigned. Toggle "Show assigned" to review them.'}
              </Typography>
            </Paper>
          )}
        </>
      )}

      {/* ── Tab 1: Active Investigations ── */}
      {activeTab === 1 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <AccessTimeIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Active Investigations
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            View ongoing violation investigations and their status
          </Typography>
          <Grid container spacing={3} justifyContent="center" maxWidth={600} mx="auto">
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 3, bgcolor: '#fefce8' }}>
                <Typography variant="h3" fontWeight={700} sx={{ color: '#854d0e' }}>
                  {Math.max(0, investigationStats.pendingReview)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Pending Review
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 3, bgcolor: 'primary.50' }}>
                <Typography variant="h3" fontWeight={700} color="primary">
                  {investigationStats.underInvestigation}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Under Investigation
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f0fdf4' }}>
                <Typography variant="h3" fontWeight={700} sx={{ color: '#166534' }}>
                  {prioritizationList.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Prioritized
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Tab 2: Investigators ── */}
      {activeTab === 2 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} flexWrap="wrap">
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom={false}>
                  Investigator Assignments
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recalls assigned to each investigator, broken out by priority.
                </Typography>
              </Box>
              <Box display="flex" gap={1}>
                <Chip variant="outlined" label={`${investigators.length} active`} />
                <Chip variant="outlined" label={`${assignmentList.length} assignments`} />
              </Box>
            </Box>
          </Paper>

          {investigatorAssignments.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No investigators found.</Typography>
            </Paper>
          )}

          {investigatorAssignments.map(({ inv, assignedRecalls }) => {
            const byPriority = {
              High: assignedRecalls.filter((r) => r.prior?.priority === 'High'),
              Medium: assignedRecalls.filter((r) => r.prior?.priority === 'Medium'),
              Low: assignedRecalls.filter((r) => r.prior?.priority === 'Low'),
              Unset: assignedRecalls.filter((r) => !r.prior?.priority),
            };
            return (
              <Paper key={inv.id} variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3} gap={2}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {inv.full_name || inv.email || `Investigator ${inv.id}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {inv.email} · {assignedRecalls.length} assigned recall{assignedRecalls.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>

                {(['High', 'Medium', 'Low'] ).map((priority) => {
                  const rows = byPriority[priority] ?? [];
                  const colors = getPriorityBgColor(priority);
                  return (
                    <Box key={priority} sx={{ mb: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Chip
                          label={`${priority} Priority`}
                          size="small"
                          variant="outlined"
                          sx={{ bgcolor: colors.bgcolor, color: colors.color, borderColor: colors.borderColor }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {rows.length} assigned
                        </Typography>
                      </Box>
                      <Paper variant="outlined" sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell scope="col"><strong>Recall</strong></TableCell>
                                <TableCell scope="col"><strong>Manufacturer</strong></TableCell>
                                <TableCell scope="col"><strong>Hazard</strong></TableCell>
                                <TableCell scope="col"><strong>Assigned</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {rows.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} sx={{ color: 'text.secondary', py: 2 }}>
                                    No {priority.toLowerCase()} priority recalls assigned.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                rows.map(({ recall, assignment }) => (
                                  <TableRow
                                    key={recall.recall_id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => openDetail(recall)}
                                  >
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={500}>
                                        {recall.title || recall.recall_id}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {recall.recall_id}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2">{recall.manufacturer || '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" color="error.main">{recall.hazard || '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {assignment?.assigned_at
                                          ? new Date(assignment.assigned_at).toLocaleDateString()
                                          : '—'}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </Box>
                  );
                })}
              </Paper>
            );
          })}
        </Box>
      )}

      {/* ── Edit Priority Dialog ── */}
      <Dialog open={editPriorityOpen} onClose={() => !editPrioritySaving && setEditPriorityOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Recall Priority</DialogTitle>
        <DialogContent>
          {editPriorityRecall && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {editPriorityRecall.title || editPriorityRecall.recall_id}
            </Typography>
          )}
          {editPriorityError && (
            <Alert severity="error" sx={{ mb: 2 }}>{editPriorityError}</Alert>
          )}
          <FormControl fullWidth disabled={editPrioritySaving}>
            <InputLabel>Priority Level</InputLabel>
            <Select
              value={editPriorityValue}
              label="Priority Level"
              onChange={(e) => setEditPriorityValue(e.target.value)}
            >
              <MenuItem value=""><em>Select priority</em></MenuItem>
              {PRIORITY_LEVELS.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPriorityOpen(false)} disabled={editPrioritySaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEditPriority}
            disabled={editPrioritySaving || !editPriorityValue}
          >
            {editPrioritySaving ? <CircularProgress size={20} color="inherit" /> : 'Update Priority'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Recall Detail Dialog ── */}
      {renderDetailDialog()}
    </Box>
  );

  function renderDetailDialog() {
    return (
      <>
      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="md">
        <DialogTitle>
          {detailRecall ? `Recall ${detailRecall.recall_id}` : 'Recall'}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading && (
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">Loading recall details…</Typography>
            </Box>
          )}
          <div role="alert" aria-live="assertive">
            {detailError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDetailError(null)}>{detailError}</Alert>
            )}
          </div>
          {detailSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDetailSuccess(null)}>{detailSuccess}</Alert>
          )}

          <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
            <Box sx={{ width: 120 }}>
              <RecallThumb url={detailDraft.image_url} title={detailDraft.title} size={96} />
            </Box>
            <Box sx={{ flex: '1 1 360px', minWidth: 280 }}>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" sx={{ mb: 2 }} onClick={(e) => e.stopPropagation()}>
                <Box sx={{ flex: '1 1 260px', minWidth: 240 }}>
                  <FormControl fullWidth size="small" disabled={!canPrioritize || detailSavingMeta}>
                    <InputLabel>Assignee (Investigator)</InputLabel>
                    <Select
                      value={detailAssigneeDraft}
                      label="Assignee (Investigator)"
                      onChange={(e) => setDetailAssigneeDraft(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value=""><em>Unassigned</em></MenuItem>
                      {investigators.map((u) => (
                        <MenuItem key={u.id} value={Number.parseInt(String(u.id), 10)}>
                          {u.full_name || u.email || `User ${u.id}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                {canPrioritize && (
                  <Button variant="contained" size="small" disabled={detailSavingMeta || !detailAssigneeDraft} onClick={() => void saveDetailAssignee()}>
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
                      <MenuItem value=""><em>Unprioritized</em></MenuItem>
                      {PRIORITY_LEVELS.map((p) => (
                        <MenuItem key={p} value={p}>{p}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                {canPrioritize && (
                  <Button variant="contained" size="small" disabled={detailSavingMeta || !detailPriorityDraft} onClick={() => void saveDetailPriority()}>
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

          {detailRecall && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Recall details</Typography>
              {(() => {
                const DENYLIST = new Set(['id', 'recall_id']);
                const hasAnyRows = recallDetailGroups.some((group) =>
                  group.fields.some((f) => {
                    if (DENYLIST.has(f.key)) return false;
                    const raw = f.source === 'draft' ? detailDraft?.[f.key] : detailRecall?.[f.key];
                    const formatted = f.format ? f.format(raw) : raw;
                    return !isValueEmpty(formatted);
                  }),
                );
                if (!hasAnyRows) {
                  return (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No additional recall details available.
                    </Typography>
                  );
                }
                return recallDetailGroups
                  .map((group) => {
                    const rows = group.fields
                      .filter((f) => !DENYLIST.has(f.key))
                      .map((f) => {
                        const raw = f.source === 'draft' ? detailDraft?.[f.key] : detailRecall?.[f.key];
                        const value = f.format ? f.format(raw) : raw;
                        const row = renderDetailRow({ label: f.label, value, kind: f.kind, isLink: f.key === 'recall_url' });
                        return row ? { key: f.key, kind: f.kind ?? 'kv', node: row } : null;
                      })
                      .filter(Boolean);

                    if (rows.length === 0) return null;
                    const multilineRows = rows.filter((r) => r.kind === 'multiline');
                    const kvRows = rows.filter((r) => r.kind !== 'multiline');

                    return (
                      <Box key={group.title} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>{group.title}</Typography>
                        {multilineRows.map((r) => <Box key={r.key}>{r.node}</Box>)}
                        {kvRows.length > 0 && (
                          <Grid container spacing={2}>
                            {kvRows.map((r) => (
                              <Grid item xs={12} sm={4} key={r.key}>{r.node}</Grid>
                            ))}
                          </Grid>
                        )}
                        <Divider sx={{ mt: 2 }} />
                      </Box>
                    );
                  })
                  .filter(Boolean);
              })()}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Managers/Admins can edit and delete; investigators have read-only view.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail} disabled={detailSaving || detailDeleting}>Close</Button>
          {canPrioritize && (
            <>
              <Button color="error" onClick={() => setDeleteConfirmOpen(true)} disabled={detailSaving || detailDeleting}>
                {detailDeleting ? 'Deleting…' : 'Delete'}
              </Button>
              <Button variant="contained" onClick={saveDetail} disabled={detailSaving || detailDeleting}>
                {detailSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Delete recall?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete recall <strong>{detailRecall?.recall_id}</strong>
            {detailRecall?.title ? ` — ${detailRecall.title}` : ''}. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void deleteDetail()}>
            Delete permanently
          </Button>
        </DialogActions>
      </Dialog>
    </>
    );
  }
}
