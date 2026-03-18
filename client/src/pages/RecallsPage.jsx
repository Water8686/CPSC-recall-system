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
} from '@mui/material';

const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];

/**
 * Recalls page — Sprint 1 core feature.
 * CPSC Manager views recall list and assigns priority (High/Medium/Low).
 */
export default function RecallsPage() {
  const [recalls, setRecalls] = useState([]);
  const [prioritizations, setPrioritizations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecallId, setSelectedRecallId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [recallsRes, priorRes] = await Promise.all([
          fetch('/api/recalls'),
          fetch('/api/prioritizations'),
        ]);
        if (!recallsRes.ok || !priorRes.ok) throw new Error('Failed to fetch data');
        const recallsData = await recallsRes.json();
        const priorData = await priorRes.json();
        setRecalls(recallsData);
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
  }, []);

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
      const res = await fetch('/api/prioritizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recall_id: selectedRecallId, priority: selectedPriority }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to save prioritization');
        return;
      }
      setPrioritizations((prev) => ({
        ...prev,
        [data.recall_id]: data,
      }));
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
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
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

      {/* Prioritization form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Prioritize Recall
        </Typography>
        <Box component="form" onSubmit={handlePrioritize} display="flex" flexDirection="column" gap={2} maxWidth={400}>
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
            <InputLabel>Priority</InputLabel>
            <Select
              value={selectedPriority}
              label="Priority"
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              {PRIORITY_LEVELS.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
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

      {/* Recall list */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recall List
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Recall ID</strong></TableCell>
                <TableCell><strong>Title</strong></TableCell>
                <TableCell><strong>Product</strong></TableCell>
                <TableCell><strong>Hazard</strong></TableCell>
                <TableCell><strong>Priority</strong></TableCell>
                <TableCell><strong>Prioritized At</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recalls.map((recall) => {
                const prior = prioritizations[recall.recall_id];
                return (
                  <TableRow key={recall.id}>
                    <TableCell>{recall.recall_id}</TableCell>
                    <TableCell>{recall.title}</TableCell>
                    <TableCell>{recall.product}</TableCell>
                    <TableCell>{recall.hazard}</TableCell>
                    <TableCell>
                      {prior ? (
                        <Chip label={prior.priority} color={getPriorityColor(prior.priority)} size="small" />
                      ) : (
                        <Typography color="text.secondary" variant="body2">—</Typography>
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
      </Paper>
    </Box>
  );
}
