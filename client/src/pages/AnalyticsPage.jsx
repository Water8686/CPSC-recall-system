import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert } from '@mui/material';

const STORAGE_KEY = 'cpsc-grafana-embed-urls';
const LEGACY_KEYS = ['cpsc-analytics-embed-urls', 'cpsc-analytics-embed-url'];

/**
 * Accepts plain d-solo URLs or a full `<iframe src="...">` line — one panel per line.
 */
function parseEmbedLines(text) {
  const urls = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const fromIframe = trimmed.match(/src\s*=\s*["']([^"']+)["']/i);
    if (fromIframe) {
      urls.push(fromIframe[1].trim());
      continue;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      urls.push(trimmed);
    }
  }
  return urls;
}

function readStoredUrls() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((u) => String(u).trim()).filter(Boolean);
      }
    }
  } catch {
    /* ignore */
  }
  for (const key of LEGACY_KEYS) {
    try {
      if (key === 'cpsc-analytics-embed-url') {
        const one = localStorage.getItem(key)?.trim();
        if (one) return [one];
      } else {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            return parsed.map((u) => String(u).trim()).filter(Boolean);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

/** Solo panel embeds — compact height; wider dashboards need more */
function iframeHeightForUrl(url) {
  try {
    const u = new URL(url);
    if (u.pathname.includes('/public-dashboards/')) return 720;
    if (u.pathname.includes('/d-solo/')) return 280;
  } catch {
    /* ignore */
  }
  return 480;
}

export default function AnalyticsPage() {
  const [panelUrls, setPanelUrls] = useState(readStoredUrls);
  const [inputText, setInputText] = useState(() => readStoredUrls().join('\n'));
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const urls = parseEmbedLines(inputText);
    setPanelUrls(urls);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Grafana
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Paste Grafana panel embeds: one per line. From each panel use{' '}
        <strong>Share → Embed</strong> and copy either the whole iframe snippet or just
        the <code>src</code> URL (<code>/d-solo/</code>). Saved only in this browser.
      </Typography>

      {panelUrls.length > 0 && (
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
          {panelUrls.map((url, i) => (
            <Paper key={`${url}-${i}`} sx={{ overflow: 'hidden' }}>
              <iframe
                src={url}
                width="100%"
                height={iframeHeightForUrl(url)}
                style={{ border: 'none', display: 'block', maxWidth: '100%' }}
                title={`Grafana panel ${i + 1}`}
                allowFullScreen
                loading="lazy"
              />
            </Paper>
          ))}
        </Box>
      )}

      {panelUrls.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Add at least one embed below. Example <code>src</code> (your test panel):
          <Box
            component="pre"
            sx={{
              mt: 1,
              mb: 0,
              p: 1,
              typography: 'caption',
              bgcolor: 'action.hover',
              borderRadius: 1,
              overflow: 'auto',
            }}
          >
            {`https://parkersmith1215.grafana.net/d-solo/pagv7zj/tech-tut?orgId=1&from=1762056000000&to=1775016000000&timezone=browser&var-Priority=$__all&panelId=panel-6`}
          </Box>
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Panel embeds
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          One URL or iframe snippet per line. Blank lines are ignored.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={5}
          size="small"
          aria-label="Grafana embed URLs, one per line"
          placeholder={`Paste iframe or URL per line, e.g.\n<iframe src="https://….grafana.net/d-solo/…" …></iframe>`}
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

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        If panels stay blank, Grafana may be sending{' '}
        <code>frame-ancestors &apos;none&apos;</code> — that is enforced by the browser, not this app.
      </Typography>
    </Box>
  );
}
