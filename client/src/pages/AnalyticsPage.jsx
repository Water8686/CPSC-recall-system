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

const STORAGE_URLS_KEY = 'cpsc-analytics-embed-urls';
const LEGACY_STORAGE_URL_KEY = 'cpsc-analytics-embed-url';
const GRAFANA_IFRAME_PREF_KEY = 'cpsc-analytics-show-grafana-iframe';

function readStoredEmbedUrls() {
  try {
    const raw = localStorage.getItem(STORAGE_URLS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((u) => String(u).trim()).filter(Boolean);
      }
    }
  } catch {
    /* ignore */
  }
  const legacy = localStorage.getItem(LEGACY_STORAGE_URL_KEY)?.trim();
  return legacy ? [legacy] : [];
}

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
  const [embedUrls, setEmbedUrls] = useState(readStoredEmbedUrls);
  const [inputText, setInputText] = useState(() => readStoredEmbedUrls().join('\n'));
  const [saved, setSaved] = useState(false);
  const [showGrafanaIframe, setShowGrafanaIframe] = useState(
    () => localStorage.getItem(GRAFANA_IFRAME_PREF_KEY) === 'true',
  );

  const hasGrafana = useMemo(
    () => embedUrls.some((u) => isGrafanaHostedUrl(u)),
    [embedUrls],
  );
  function shouldRenderIframeForUrl(url) {
    if (!isGrafanaHostedUrl(url)) return true;
    return showGrafanaIframe;
  }

  function handleSave() {
    const urls = inputText
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    setEmbedUrls(urls);
    localStorage.setItem(STORAGE_URLS_KEY, JSON.stringify(urls));
    localStorage.removeItem(LEGACY_STORAGE_URL_KEY);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Analytics Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Add one embed URL per line. For <strong>live</strong> Grafana graphs, use{' '}
        <strong>Share</strong> on each <em>panel</em> (not the whole dashboard) →{' '}
        <strong>Embed</strong>, and paste each <code>src</code> URL here — those use{' '}
        <code>/d-solo/</code> and refresh with your panel interval. Looker Studio: one
        report URL per line if needed. Hosted Grafana may still block iframes unless
        embedding is allowed on your stack.
      </Typography>

      {embedUrls.length > 0 && hasGrafana ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" component="div" sx={{ mb: 1 }}>
            Grafana may refuse iframes (<code>frame-ancestors &apos;none&apos;</code>) —
            the browser enforces this. Use <strong>Open panel</strong> links below, or
            enable embedding for your Grafana stack. See{' '}
            <Link
              href="https://grafana.com/blog/how-to-embed-grafana-dashboards-into-web-applications/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Grafana: embedding dashboards in web apps
            </Link>{' '}
            and{' '}
            <Link
              href="https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-security-hardening/"
              target="_blank"
              rel="noopener noreferrer"
            >
              security / embedding docs
            </Link>
            .
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1 }}>
            {embedUrls.map((url, i) =>
              isGrafanaHostedUrl(url) ? (
                <Button
                  key={`${url}-${i}`}
                  size="small"
                  variant="contained"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  component="a"
                >
                  Open panel {i + 1}
                </Button>
              ) : null,
            )}
          </Box>
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
            label="Try embedded iframes anyway (only if Grafana allows embedding)"
          />
        </Alert>
      ) : null}

      {embedUrls.some((url) => shouldRenderIframeForUrl(url)) ? (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            mb: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
            },
          }}
        >
          {embedUrls.map((url, i) =>
            shouldRenderIframeForUrl(url) ? (
              <Paper key={`${url}-${i}`} sx={{ overflow: 'hidden' }}>
                <iframe
                  src={url}
                  width="100%"
                  height={iframeHeightForUrl(url)}
                  style={{ border: 'none', display: 'block', maxWidth: '100%' }}
                  title={`Embedded panel ${i + 1}`}
                  allowFullScreen
                  loading="lazy"
                />
              </Paper>
            ) : null,
          )}
        </Box>
      ) : null}

      {embedUrls.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No embed URLs yet. Paste one URL per line — for Grafana live panels, use Share →
          Embed on each panel. Stored only in this browser.
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Configure embed URLs (one per line)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Grafana (live panels):</strong> open the dashboard, use the panel title
          menu → <strong>Share</strong> → <strong>Embed</strong> → copy the iframe{' '}
          <code>src</code> (contains <code>/d-solo/</code>). Repeat for each graph.{' '}
          <strong>Looker Studio:</strong> one embed <code>src</code> per line.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={4}
          size="small"
          aria-label="Analytics embed URLs, one per line"
          placeholder={`https://your-stack.grafana.net/d-solo/…panelId=…\nhttps://your-stack.grafana.net/d-solo/…`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
        {saved && (
          <Typography variant="caption" color="success.main" sx={{ mt: 1, ml: 2 }}>
            Saved!
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
