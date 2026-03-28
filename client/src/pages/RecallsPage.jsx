import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Tabs,
  Tab,
  Grid,
  FormControlLabel,
  Switch,
  Avatar,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { Chart } from 'react-google-charts';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { canAccessManagerFeatures, normalizeAppRole } from 'shared';

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

function PriorityCharts({ prioritizations }) {
  const counts = { High: 0, Medium: 0, Low: 0 };
  prioritizations.forEach((p) => {
    if (counts[p.priority] !== undefined) counts[p.priority]++;
  });

  const barChartData = [
    ['Priority', 'Count'],
    ['High', counts.High],
    ['Medium', counts.Medium],
    ['Low', counts.Low],
  ];

  const pieChartData = [
    ['Priority', 'Count'],
    ['High', counts.High],
    ['Medium', counts.Medium],
    ['Low', counts.Low],
  ];

  const barChartOptions = {
    title: 'Recalls by Priority',
    chartArea: { width: '60%' },
    hAxis: { title: 'Count', minValue: 0 },
    vAxis: { title: 'Priority' },
  };

  const pieChartOptions = {
    title: 'Percentage of Recalls by Priority',
    pieHole: 0.4,
    sliceVisibilityThreshold: 0,
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Chart
            chartType="BarChart"
            width="100%"
            height="400px"
            data={barChartData}
            options={barChartOptions}
          />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Chart
            chartType="PieChart"
            width="100%"
            height="400px"
            data={pieChartData}
            options={pieChartOptions}
          />
        </Paper>
      </Grid>
    </Grid>
  );
}

/**
 * Recalls page — Sprint 1: prioritize recalls, analytics, manager-only API for writes.
 */
export default function RecallsPage() {
  const { session, profile, user } = useAuth();
  const role = normalizeAppRole(
    profile,
    user?.user_metadata?.role ?? user?.app_metadata?.role,
  );
  const canPrioritize = canAccessManagerFeatures(role);
  const recallColSx = recallTableColumnSx(canPrioritize);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() =>
    searchParams.get('tab') === 'analytics' ? 1 : 0
  );

  const [recalls, setRecalls] = useState([]);
  const [prioritizations, setPrioritizations] = useState({});
  const [prioritizationList, setPrioritizationList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecallId, setSelectedRecallId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  /** Per-row priority dropdown overrides (recall_number string key). */
  const [rowPriorityDraft, setRowPriorityDraft] = useState({});
  const [rowSavingRecallId, setRowSavingRecallId] = useState(null);
  const [recallIdFilter, setRecallIdFilter] = useState('');
  const [prioritizedOnly, setPrioritizedOnly] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    const t = searchParams.get('tab') === 'analytics' ? 1 : 0;
    setTab(t);
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [recallsRes, priorRes] = await Promise.all([
          apiFetch('/api/recalls', session),
          apiFetch('/api/prioritizations', session),
        ]);
        if (!recallsRes.ok) {
          throw new Error(await getApiErrorMessage(recallsRes, 'Failed to load recalls'));
        }
        if (!priorRes.ok) {
          throw new Error(await getApiErrorMessage(priorRes, 'Failed to load prioritizations'));
        }
        const recallsData = await recallsRes.json();
        const priorData = await priorRes.json();
        setRecalls(recallsData);
        setPrioritizationList(priorData);
        const priorMap = {};
        priorData.forEach((p) => {
          priorMap[p.recall_id] = p;
        });
        setPrioritizations(priorMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [session]);

  const handleTabChange = (_e, newValue) => {
    setTab(newValue);
    setSearchParams(newValue === 1 ? { tab: 'analytics' } : {});
  };

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

  const handlePrioritize = (e) => {
    e.preventDefault();
    void savePrioritization(selectedRecallId, selectedPriority, { fromForm: true });
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
  }, [recalls, recallIdFilter, prioritizedOnly, prioritizations, sortField, sortDir]);

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
          ? 'Prioritize recalls and review priority analytics (Sprint 1).'
          : 'View recalls and priority assignments. Only CPSC Managers and Admins can change priority.'}
      </Typography>

      <Tabs value={tab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Prioritize Recalls" />
        <Tab label="Analytics" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ pt: 3 }}>
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
                  onChange={(_, value) => setSelectedRecallId(value?.recall_id ?? '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Recall ID" placeholder="Select a recall" required />
                  )}
                />
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
                  minWidth: { xs: 720, md: 960 },
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
                    return (
                      <TableRow key={recall.id}>
                        <TableCell sx={recallColSx.image}>
                          <RecallThumb url={recall.image_url} title={recall.title} />
                        </TableCell>
                        <TableCell sx={recallColSx.recall_id}>{recall.recall_id}</TableCell>
                        <TableCell sx={recallColSx.title}>{recall.title}</TableCell>
                        <TableCell sx={recallColSx.product}>{recall.product}</TableCell>
                        <TableCell sx={recallColSx.hazard}>{recall.hazard}</TableCell>
                        <TableCell sx={recallColSx.priority}>
                          {canPrioritize ? (
                            <Box
                              display="flex"
                              alignItems="center"
                              gap={1}
                              flexWrap="wrap"
                              sx={{ maxWidth: '100%' }}
                            >
                              <FormControl size="small" sx={{ minWidth: 120, flex: '1 1 auto' }}>
                                <InputLabel id={`priority-label-${recall.id}`}>Priority</InputLabel>
                                <Select
                                  labelId={`priority-label-${recall.id}`}
                                  label="Priority"
                                  value={rowPriority}
                                  displayEmpty
                                  disabled={rowSaving}
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
      )}

      {tab === 1 && (
        <Box sx={{ pt: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Recall priority overview — OKR 1.1 &amp; 1.2
          </Typography>
          <PriorityCharts prioritizations={prioritizationList} />
        </Box>
      )}
    </Box>
  );
}
