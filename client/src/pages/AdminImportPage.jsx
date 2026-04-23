import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  Link,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Stack,
  LinearProgress,
  Collapse,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useAuth } from '../context/AuthContext';

const CPSC_API_INFO =
  'https://www.cpsc.gov/Recalls/CPSC-Recalls-Application-Program-Interface-API-Information';

function localYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function setRollingDays(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start: localYmd(start), end: localYmd(end) };
}

export default function AdminImportPage() {
  const { session, isMockMode } = useAuth();
  const [mainTab, setMainTab] = useState(0);
  const [file, setFile] = useState(null);
  const [csvUrl, setCsvUrl] = useState('');
  const [cpscMode, setCpscMode] = useState('range');
  const [cpscRecallNumber, setCpscRecallNumber] = useState('');
  /** Matches cpsc.gov “recent” listings: filter by LastPublishDate, not RecallDate. */
  const [cpscDateBasis, setCpscDateBasis] = useState('lastPublish');
  const [cpscDateStart, setCpscDateStart] = useState('');
  const [cpscDateEnd, setCpscDateEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [techOpen, setTechOpen] = useState(false);
  const [scheduleInfo, setScheduleInfo] = useState(null);

  const authHeaders = () => {
    const h = new Headers();
    if (session?.access_token) {
      h.set('Authorization', `Bearer ${session.access_token}`);
    }
    return h;
  };

  const clearFeedback = () => {
    setError(null);
    setResult(null);
  };

  useEffect(() => {
    let cancelled = false;
    const loadSchedule = async () => {
      try {
        const res = await fetch('/api/admin/recalls/import-cpsc-schedule', {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.schedule) return;
        if (!cancelled) setScheduleInfo(data.schedule);
      } catch {
        // Non-blocking: manual import still works even if schedule status fails to load.
      }
    };
    if (session?.access_token) loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const handleFileImport = async (e) => {
    e.preventDefault();
    clearFeedback();
    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    const headers = authHeaders();
    const res = await fetch('/api/admin/recalls/import-csv', {
      method: 'POST',
      headers,
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Import failed');
      if (data.rowErrors?.length) setResult(data);
      return;
    }
    setResult(data);
    setFile(null);
  };

  const handleUrlImport = async (e) => {
    e.preventDefault();
    clearFeedback();
    const u = csvUrl.trim();
    if (!u) {
      setError('Enter a CSV URL (https://…).');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/admin/recalls/import-csv-url', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ csvUrl: u }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Import failed');
      if (data.rowErrors?.length) setResult(data);
      return;
    }
    setResult(data);
  };

  const handleCpscImport = async (e) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);
    const body =
      cpscMode === 'number'
        ? { recallNumber: cpscRecallNumber.trim() || undefined }
        : {
            recallDateStart: cpscDateStart.trim() || undefined,
            recallDateEnd: cpscDateEnd.trim() || undefined,
            dateBasis: cpscDateBasis,
          };
    const headers = authHeaders();
    headers.set('Content-Type', 'application/json');
    const res = await fetch('/api/admin/recalls/import-cpsc', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'CPSC import failed');
      return;
    }
    setResult(data);
  };

  const applyPreset = (days) => {
    const { start, end } = setRollingDays(days);
    setCpscDateBasis('lastPublish');
    setCpscDateStart(start);
    setCpscDateEnd(end);
    setCpscMode('range');
    setCpscRecallNumber('');
  };

  if (isMockMode) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Batch import
        </Typography>
        <Alert severity="info" icon={<InfoOutlinedIcon />}>
          Sign in with a real account (not mock mode) to import recalls.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Batch import
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Add or update recalls in your database. Choose a source below —{' '}
        <strong>pulling from CPSC</strong> is usually the easiest for real data.
      </Typography>

      {loading && (
        <LinearProgress sx={{ mb: 2, borderRadius: 1 }} aria-label="Import in progress" />
      )}

      <div role="alert" aria-live="assertive">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </div>

      {result?.ok && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResult(null)}>
          <Typography variant="subtitle2" gutterBottom>
            {result.upserted > 0
              ? `Done — ${result.upserted} recall${result.upserted === 1 ? '' : 's'} saved`
              : 'Import finished'}
          </Typography>
          {result.fetched != null && (
            <Typography variant="body2" color="text.secondary">
              CPSC returned {result.fetched} record{result.fetched === 1 ? '' : 's'}
              {result.upserted !== result.fetched && result.upserted > 0
                ? ` (${result.upserted} saved after checks)`
                : ''}
              .
              {result.dateBasis === 'lastPublish' && (
                <> Filter: last publish date.</>
              )}
              {result.dateBasis === 'recall' && <> Filter: recall date.</>}
            </Typography>
          )}
          {result.source === 'url' && result.csvUrl && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Source: <code style={{ wordBreak: 'break-all' }}>{result.csvUrl}</code>
            </Typography>
          )}
          {result.message && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {result.message}
            </Typography>
          )}
          {result.source === 'cpsc' && result.cpscRequestUrl && (
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      transform: techOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                }
                onClick={() => setTechOpen(!techOpen)}
              >
                Technical details
              </Button>
              <Collapse in={techOpen}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
                  {result.cpscRequestUrl}
                </Typography>
              </Collapse>
            </Box>
          )}
        </Alert>
      )}

      {result?.skipped?.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setResult(null)}>
          <Typography variant="subtitle2" gutterBottom>
            Some rows were skipped
          </Typography>
          <List dense disablePadding>
            {result.skipped.slice(0, 8).map((s, i) => (
              <ListItem key={i} disableGutters>
                <ListItemText primary={typeof s === 'object' ? JSON.stringify(s) : String(s)} />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}

      {(result?.parseErrors?.length > 0 || result?.upsertFailures?.length > 0) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {result.parseErrors?.length > 0 && (
            <>
              <Typography variant="subtitle2">CSV row issues</Typography>
              <List dense disablePadding>
                {result.parseErrors.slice(0, 12).map((e) => (
                  <ListItem key={`${e.row}-${e.message}`} disableGutters>
                    <ListItemText primary={`Row ${e.row}: ${e.message}`} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {result.upsertFailures?.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Database upsert issues
              </Typography>
              <List dense disablePadding>
                {result.upsertFailures.map((e) => (
                  <ListItem key={e.recall_number} disableGutters>
                    <ListItemText primary={`${e.recall_number}: ${e.message}`} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={mainTab}
          onChange={(_, v) => {
            setMainTab(v);
            clearFeedback();
          }}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="From CPSC" id="batch-tab-0" aria-controls="batch-panel-0" />
          <Tab label="CSV file" id="batch-tab-1" aria-controls="batch-panel-1" />
          <Tab label="CSV link" id="batch-tab-2" aria-controls="batch-panel-2" />
        </Tabs>

        <Box role="tabpanel" hidden={mainTab !== 0} id="batch-panel-0" sx={{ p: 3 }}>
          {mainTab === 0 && (
            <Box component="form" onSubmit={handleCpscImport}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Pull recalls directly from the{' '}
                <Link href={CPSC_API_INFO} target="_blank" rel="noopener noreferrer">
                  official CPSC SaferProducts service
                </Link>
                . Data is saved into your recalls list (new rows or updates if the recall number
                already exists).
              </Typography>
              {scheduleInfo && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: scheduleInfo.enabled ? 'success.50' : 'warning.50',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <ScheduleIcon fontSize="small" />
                    <Typography variant="subtitle2">Automated CPSC import schedule</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {scheduleInfo.humanSchedule}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      color={scheduleInfo.enabled ? 'success' : 'warning'}
                      label={scheduleInfo.enabled ? 'Enabled' : 'Disabled'}
                    />
                    <Chip size="small" variant="outlined" label={`TZ: ${scheduleInfo.timezone}`} />
                    <Chip size="small" variant="outlined" label={`CRON: ${scheduleInfo.cron}`} />
                  </Stack>
                  {scheduleInfo.importWindow && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Window: {scheduleInfo.importWindow.recallDateStart} to{' '}
                      {scheduleInfo.importWindow.recallDateEnd} ({scheduleInfo.importWindow.label})
                    </Typography>
                  )}
                </Paper>
              )}

              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                How do you want to search?
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={cpscMode}
                onChange={(_, v) => {
                  if (v == null) return;
                  setCpscMode(v);
                  clearFeedback();
                  if (v === 'number') {
                    setCpscDateStart('');
                    setCpscDateEnd('');
                  } else {
                    setCpscRecallNumber('');
                  }
                }}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="range">By date range</ToggleButton>
                <ToggleButton value="number">By recall number</ToggleButton>
              </ToggleButtonGroup>

              {cpscMode === 'number' ? (
                <TextField
                  fullWidth
                  size="small"
                  label="CPSC recall number"
                  placeholder="e.g. 24090"
                  helperText="Digits only or with dashes — we import that one recall."
                  value={cpscRecallNumber}
                  onChange={(e) => setCpscRecallNumber(e.target.value)}
                  sx={{ mb: 2 }}
                />
              ) : (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Quick presets (optional)
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                    <Chip
                      label="Last 7 days (by publish date)"
                      onClick={() => applyPreset(7)}
                      variant="outlined"
                    />
                    <Chip
                      label="Last 30 days (by publish date)"
                      onClick={() => applyPreset(30)}
                      variant="outlined"
                    />
                    <Chip
                      label="Last 90 days (by publish date)"
                      onClick={() => applyPreset(90)}
                      variant="outlined"
                    />
                    <Chip
                      label="Default (leave dates empty)"
                      onClick={() => {
                        setCpscDateBasis('lastPublish');
                        setCpscDateStart('');
                        setCpscDateEnd('');
                      }}
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Date range applies to
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={cpscDateBasis}
                    onChange={(_, v) => {
                      if (v == null) return;
                      setCpscDateBasis(v);
                    }}
                    sx={{ mb: 2 }}
                    aria-label="CPSC date field for range filter"
                  >
                    <ToggleButton value="lastPublish">Last publish date</ToggleButton>
                    <ToggleButton value="recall">Recall date</ToggleButton>
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    CPSC.gov “recent” recalls follow <strong>last publish</strong> timing. Use{' '}
                    <strong>Recall date</strong> only when you need the statutory recall date field.
                  </Typography>
                  <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 1 }}>
                    <TextField
                      size="small"
                      type="date"
                      label="From"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      helperText={
                        cpscDateBasis === 'lastPublish'
                          ? 'Last publish date — start'
                          : 'Recall date — start'
                      }
                      value={cpscDateStart}
                      onChange={(e) => setCpscDateStart(e.target.value)}
                    />
                    <TextField
                      size="small"
                      type="date"
                      label="To"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      helperText={
                        cpscDateBasis === 'lastPublish'
                          ? 'Last publish date — end'
                          : 'Recall date — end'
                      }
                      value={cpscDateEnd}
                      onChange={(e) => setCpscDateEnd(e.target.value)}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Leave both dates empty to use the server default (last 30 days, UTC). The filter
                    above still applies to that window. Maximum range is about one year.
                  </Typography>
                </>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<CloudSyncIcon />}
                disabled={loading || (cpscMode === 'number' && !cpscRecallNumber.trim())}
              >
                {loading ? 'Working…' : 'Import from CPSC'}
              </Button>
            </Box>
          )}
        </Box>

        <Box role="tabpanel" hidden={mainTab !== 1} id="batch-panel-1" sx={{ p: 3 }}>
          {mainTab === 1 && (
            <Box component="form" onSubmit={handleFileImport}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Upload a spreadsheet you exported or built. Required column:{' '}
                <code>recall_number</code>.{' '}
                <Link href="/recalls-import-template.csv" download>
                  Download a template
                </Link>
                .
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" sx={{ mb: 2 }}>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                  Choose file
                  <input
                    type="file"
                    name="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {file ? file.name : 'No file selected'}
                </Typography>
              </Box>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !file}
                fullWidth
                size="large"
              >
                {loading ? 'Importing…' : 'Upload and import'}
              </Button>
            </Box>
          )}
        </Box>

        <Box role="tabpanel" hidden={mainTab !== 2} id="batch-panel-2" sx={{ p: 3 }}>
          {mainTab === 2 && (
            <Box component="form" onSubmit={handleUrlImport}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                If your CSV is hosted somewhere (HTTPS in production), paste the link and we’ll
                download and import it.
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="CSV file URL"
                placeholder="https://…"
                value={csvUrl}
                onChange={(e) => setCsvUrl(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !csvUrl.trim()}
                fullWidth
                size="large"
                startIcon={<LinkIcon />}
              >
                {loading ? 'Importing…' : 'Fetch and import'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
