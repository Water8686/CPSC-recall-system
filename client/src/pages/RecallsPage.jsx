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
} from '@mui/material';
import { Chart } from 'react-google-charts';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { canAccessManagerFeatures, normalizeAppRole } from 'shared';

const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];

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
  const [recallIdFilter, setRecallIdFilter] = useState('');
  const [prioritizedOnly, setPrioritizedOnly] = useState(false);

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

  const handlePrioritize = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!selectedRecallId || !selectedPriority) {
      setSubmitError('Please select a recall and priority.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await apiFetch('/api/prioritizations', session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: selectedRecallId, priority: selectedPriority }),
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
      setSelectedRecallId('');
      setSelectedPriority('');
    } catch (err) {
      setSubmitError(err.message || 'Failed to save prioritization');
    } finally {
      setSubmitLoading(false);
    }
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

  const filteredRecalls = useMemo(() => {
    let list = recalls;
    const q = recallIdFilter.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.recall_id.toLowerCase().includes(q));
    }
    if (prioritizedOnly) {
      list = list.filter((r) => prioritizations[r.recall_id]);
    }
    return list;
  }, [recalls, recallIdFilter, prioritizedOnly, prioritizations]);

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
                maxWidth={400}
              >
                <Autocomplete
                  options={recalls}
                  getOptionLabel={(r) => `${r.recall_id} — ${r.title}`}
                  value={recalls.find((r) => r.recall_id === selectedRecallId) ?? null}
                  onChange={(_, value) => setSelectedRecallId(value?.recall_id ?? '')}
                  renderInput={(params) => (
                    <TextField {...params} label="Recall ID" placeholder="Select a recall" required />
                  )}
                />
                <FormControl fullWidth required>
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
                <Button type="submit" variant="contained" disabled={submitLoading}>
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
            <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="Search by Recall ID"
                placeholder="e.g. 24-001"
                value={recallIdFilter}
                onChange={(e) => setRecallIdFilter(e.target.value)}
                sx={{ minWidth: 220 }}
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Recall ID</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Title</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Product</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Hazard</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Priority</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Prioritized At</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecalls.map((recall) => {
                    const prior = prioritizations[recall.recall_id];
                    return (
                      <TableRow key={recall.id}>
                        <TableCell>{recall.recall_id}</TableCell>
                        <TableCell>{recall.title}</TableCell>
                        <TableCell>{recall.product}</TableCell>
                        <TableCell>{recall.hazard}</TableCell>
                        <TableCell>
                          {prior ? (
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
                        <TableCell>
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
