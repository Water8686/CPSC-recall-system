import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  LinearProgress,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import PageTitle from '../components/PageTitle';

export default function RecallsImportPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError('Choose a CSV file.');
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/recalls/import', {
      method: 'POST',
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
      body: fd,
    });
    setBusy(false);
    if (!res.ok) {
      setError(await getApiErrorMessage(res, 'Import failed'));
      return;
    }
    const data = await res.json();
    setResult(data);
  };

  return (
    <Box>
      <PageTitle title="Import recalls" />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Import recalls (CSV)
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Columns: <code>recall_number</code>, <code>recall_title</code>, <code>product_name</code>,{' '}
        <code>hazard</code>, optional <code>recall_date</code>, <code>status</code>, etc. Download a{' '}
        <a href="/sample-recalls-import.csv">sample CSV</a>.
      </Typography>
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, maxWidth: 560 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {result && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Imported {result.imported}, skipped {result.skipped}.{' '}
            {result.errors?.length > 0 && `${result.errors.length} row errors.`}
          </Alert>
        )}
        {busy && <LinearProgress sx={{ mb: 2 }} />}
        <Button variant="outlined" component="label" sx={{ mb: 2 }}>
          Choose CSV file
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Button>
        {file && (
          <Typography variant="body2" display="block" mb={2}>
            {file.name}
          </Typography>
        )}
        <Box display="flex" gap={2}>
          <Button type="submit" variant="contained" disabled={busy}>
            Upload
          </Button>
          <Button type="button" variant="text" onClick={() => navigate('/recalls')}>
            Back to recalls
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
