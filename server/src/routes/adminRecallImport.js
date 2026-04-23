import { Router } from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { parseRecallCsv, upsertRecallRecords } from '../lib/csvRecallImport.js';
import {
  resolveCpscDateWindow,
  resolveCpscDateBasis,
  fetchCpscRecallsJson,
  cpscItemsToRecallRecords,
} from '../lib/cpscApiImport.js';
import { getCpscImportScheduleInfo } from '../lib/cpscWeeklyImportScheduler.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/recalls/import-cpsc-schedule', requireAdmin, (_req, res) => {
  return res.json({
    ok: true,
    schedule: getCpscImportScheduleInfo(),
  });
});

function allowFetchUrl(urlString) {
  let u;
  try {
    u = new URL(urlString);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (process.env.NODE_ENV === 'production' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return process.env.NODE_ENV !== 'production';
  }
  if (host.endsWith('.local')) return false;
  return true;
}

/** POST /api/admin/recalls/import-csv — multipart field "file" */
router.post(
  '/recalls/import-csv',
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database not configured' });
    }
    const buf = req.file?.buffer;
    if (!buf) {
      return res.status(400).json({ error: 'Missing CSV file (field name: file)' });
    }
    const text = buf.toString('utf8');
    const { records, rowErrors } = parseRecallCsv(text);
    if (records.length === 0 && rowErrors.length > 0) {
      return res.status(400).json({
        error: 'No valid rows',
        rowErrors: rowErrors.slice(0, 50),
        rowErrorsTruncated: rowErrors.length > 50,
      });
    }

    const { upserted, failed } = await upsertRecallRecords(supabaseAdmin, records);
    return res.json({
      ok: true,
      source: 'upload',
      upserted,
      parseErrors: rowErrors,
      parseErrorsTruncated: rowErrors.length > 50,
      upsertFailures: failed.slice(0, 20),
      upsertFailuresTruncated: failed.length > 20,
    });
  },
);

/** POST /api/admin/recalls/import-csv-url — JSON { "csvUrl": "https://..." } (HTTP API batch import) */
router.post('/recalls/import-csv-url', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  const csvUrl = String(req.body?.csvUrl ?? '').trim();
  if (!csvUrl) {
    return res.status(400).json({ error: 'csvUrl is required' });
  }
  if (!allowFetchUrl(csvUrl)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  let text;
  try {
    const r = await fetch(csvUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'text/csv,text/plain,*/*' },
    });
    if (!r.ok) {
      return res.status(400).json({ error: `Fetch failed: HTTP ${r.status}` });
    }
    const ct = (r.headers.get('content-type') ?? '').toLowerCase();
    if (ct.includes('text/html')) {
      return res.status(400).json({ error: 'Refusing to import HTML (expected CSV text)' });
    }
    text = await r.text();
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Fetch failed' });
  }

  const { records, rowErrors } = parseRecallCsv(text);
  if (records.length === 0 && rowErrors.length > 0) {
    return res.status(400).json({
      error: 'No valid rows',
      rowErrors: rowErrors.slice(0, 50),
      rowErrorsTruncated: rowErrors.length > 50,
    });
  }

  const { upserted, failed } = await upsertRecallRecords(supabaseAdmin, records);
  return res.json({
    ok: true,
    source: 'url',
    csvUrl,
    upserted,
    parseErrors: rowErrors,
    parseErrorsTruncated: rowErrors.length > 50,
    upsertFailures: failed.slice(0, 20),
    upsertFailuresTruncated: failed.length > 20,
  });
});

/**
 * POST /api/admin/recalls/import-cpsc — JSON body
 * { recallNumber?: string } OR { recallDateStart?: string, recallDateEnd?: string, dateBasis?: 'recall' | 'lastPublish' }
 * If no recall number and no dates: defaults to last 30 days (UTC). dateBasis defaults to recall when omitted.
 */
router.post('/recalls/import-cpsc', requireAdmin, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Database not configured' });
  }

  const recallNumber = String(req.body?.recallNumber ?? '').trim();

  let query;
  let dateBasisForResponse;
  if (recallNumber) {
    query = { recallNumber };
  } else {
    const basisRes = resolveCpscDateBasis(req.body);
    if (basisRes.error) {
      return res.status(400).json({ error: basisRes.error });
    }
    dateBasisForResponse = basisRes.dateBasis;
    const window = resolveCpscDateWindow(req.body);
    if (window.error) {
      return res.status(400).json({ error: window.error });
    }
    query = {
      recallDateStart: window.recallDateStart,
      recallDateEnd: window.recallDateEnd,
      dateBasis: basisRes.dateBasis,
    };
  }

  try {
    const { url, items } = await fetchCpscRecallsJson(query);
    const { records, skipped } = cpscItemsToRecallRecords(items);

    if (records.length === 0) {
      return res.json({
        ok: true,
        source: 'cpsc',
        ...(dateBasisForResponse != null ? { dateBasis: dateBasisForResponse } : {}),
        cpscRequestUrl: url,
        fetched: items.length,
        upserted: 0,
        skipped,
        message:
          items.length === 0
            ? 'CPSC returned no recalls for this query'
            : 'No rows could be mapped (missing recall numbers)',
      });
    }

    const { upserted, failed } = await upsertRecallRecords(supabaseAdmin, records);
    return res.json({
      ok: true,
      source: 'cpsc',
      ...(dateBasisForResponse != null ? { dateBasis: dateBasisForResponse } : {}),
      cpscRequestUrl: url,
      fetched: items.length,
      upserted,
      skipped,
      upsertFailures: failed.slice(0, 20),
      upsertFailuresTruncated: failed.length > 20,
    });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'CPSC import failed' });
  }
});

export default router;
