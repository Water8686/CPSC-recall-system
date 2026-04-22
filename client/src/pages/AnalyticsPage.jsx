import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert } from '@mui/material';

export default function AnalyticsPage() {
  const [embedUrl, setEmbedUrl] = useState(
    () => localStorage.getItem('cpsc-analytics-embed-url') || '',
  );
  const [inputUrl, setInputUrl] = useState(embedUrl);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const url = inputUrl.trim();
    setEmbedUrl(url);
    localStorage.setItem('cpsc-analytics-embed-url', url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Analytics Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Powered by Google Analytics — embed a Looker Studio dashboard or view
        GA reports.
      </Typography>

      {embedUrl ? (
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <iframe
            src={embedUrl}
            width="100%"
            height="700"
            style={{ border: 'none', display: 'block' }}
            title="Analytics Dashboard"
            allowFullScreen
          />
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          No dashboard URL configured. Paste a Looker Studio embed URL below to
          display your analytics dashboard here.
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Configure Dashboard Embed URL
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste the embed URL from Looker Studio (Sharing → Embed report → copy
          the src URL from the iframe code). This is saved in your browser only.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            aria-label="Analytics dashboard embed URL"
            placeholder="https://lookerstudio.google.com/embed/reporting/..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </Box>
        {saved && (
          <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
            Saved!
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
