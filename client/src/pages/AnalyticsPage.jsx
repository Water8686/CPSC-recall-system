import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Link,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

const GRAFANA_IFRAME_PREF_KEY = 'cpsc-analytics-show-grafana-iframe';

/** Hosted Grafana uses CSP frame-ancestors; public-dashboard URLs often ship frame-ancestors 'none'. */
function isGrafanaHostedUrl(url) {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return h === 'grafana.net' || h.endsWith('.grafana.net') || h.endsWith('.grafana.com');
  } catch {
    return false;
  }
}

/** Grafana panel embeds use /d-solo/; full dashboard embeds use /d/ — different ideal heights */
function iframeHeightForUrl(url) {
  if (!url) return 700;
  try {
    const u = new URL(url);
    if (u.pathname.includes('/public-dashboards/')) return 720;
    if (u.pathname.includes('/d-solo/')) return 280;
  } catch {
    /* ignore */
  }
  return 700;
}

export default function AnalyticsPage() {
  const [embedUrl, setEmbedUrl] = useState(
    () => localStorage.getItem('cpsc-analytics-embed-url') || '',
  );
  const [inputUrl, setInputUrl] = useState(embedUrl);
  const [saved, setSaved] = useState(false);
  const [showGrafanaIframe, setShowGrafanaIframe] = useState(
    () => localStorage.getItem(GRAFANA_IFRAME_PREF_KEY) === 'true',
  );

  const iframeHeight = useMemo(() => iframeHeightForUrl(embedUrl), [embedUrl]);
  const grafanaUrl = useMemo(() => isGrafanaHostedUrl(embedUrl), [embedUrl]);
  const renderIframe = Boolean(embedUrl && (!grafanaUrl || showGrafanaIframe));

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
        Embed a Looker Studio report, or link to Grafana Cloud. Hosted Grafana often
        blocks in-app frames (browser security); for Grafana, use{' '}
        <strong>Open in Grafana</strong> unless your admin enables embedding.
      </Typography>

      {embedUrl && grafanaUrl ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" component="div" sx={{ mb: 1 }}>
            Grafana pages often cannot be embedded in another site: the response includes a
            Content-Security-Policy directive <code>frame-ancestors &apos;none&apos;</code>,
            which the browser enforces (this app cannot override it). Use{' '}
            <strong>Open in Grafana</strong> below, or ask a Grafana admin to enable embedding
            for your stack and use a Share → Embed URL — see{' '}
            <Link
              href="https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-security-hardening/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Grafana security / embedding docs
            </Link>
            .
          </Typography>
          <Button
            variant="contained"
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            component="a"
            sx={{ mr: 2 }}
          >
            Open in Grafana
          </Button>
          <FormControlLabel
            control={
              <Checkbox
                checked={showGrafanaIframe}
                onChange={(_, checked) => {
                  setShowGrafanaIframe(checked);
                  localStorage.setItem(GRAFANA_IFRAME_PREF_KEY, checked ? 'true' : 'false');
                }}
              />
            }
            label="Try embedded preview anyway (only if embedding is enabled)"
          />
        </Alert>
      ) : null}

      {embedUrl && renderIframe ? (
        <Paper sx={{ overflow: 'hidden', mb: 3 }}>
          <iframe
            src={embedUrl}
            width="100%"
            height={iframeHeight}
            style={{ border: 'none', display: 'block', maxWidth: '100%' }}
            title="Analytics Dashboard"
            allowFullScreen
            loading="lazy"
          />
        </Paper>
      ) : null}

      {!embedUrl && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No embed URL configured. Paste the iframe <strong>src</strong> URL below
          (for Grafana: from Share → Embed). This is saved in your browser only.
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Configure embed URL
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Grafana Cloud:</strong> paste a public dashboard URL or the{' '}
          <code>src</code> from Share → Embed if embedding is enabled.{' '}
          <strong>Looker Studio:</strong> Sharing → Embed report → copy the iframe{' '}
          <code>src</code>. The URL is stored only in this browser.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            aria-label="Analytics dashboard embed URL"
            placeholder="https://….grafana.net/… or https://lookerstudio.google.com/embed/…"
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
