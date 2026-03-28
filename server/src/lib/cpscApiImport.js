/**
 * Official CPSC SaferProducts Recall REST API (JSON).
 * @see https://www.cpsc.gov/Recalls/CPSC-Recalls-Application-Program-Interface-API-Information
 */
export const CPSC_RECALL_API =
  'https://www.saferproducts.gov/RestWebServices/Recall';

const MAX_RANGE_DAYS = 366;
const DEFAULT_RANGE_DAYS = 30;
const FETCH_TIMEOUT_MS = 120_000;
const MAX_RECALLS = 5000;

/** Normalize CPSC recall numbers (e.g. "24090" → "24-090") for display/DB consistency. */
export function normalizeRecallNumber(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (s.includes('-')) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return s;
}

function parseIsoDate(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Map one CPSC JSON recall object to public.recall row shape.
 * @param {Record<string, unknown>} item
 */
export function mapCpscJsonItemToRecallRecord(item) {
  const num = normalizeRecallNumber(item.RecallNumber);
  const product = Array.isArray(item.Products) ? item.Products[0] : null;
  const hazardObj = Array.isArray(item.Hazards) ? item.Hazards[0] : null;
  const hazardText = hazardObj?.Name != null ? String(hazardObj.Name) : '';
  const img = Array.isArray(item.Images) ? item.Images[0] : null;
  const title =
    item.Title != null && String(item.Title).trim()
      ? String(item.Title).trim()
      : String(item.Description ?? 'Recall').slice(0, 500);

  return {
    recall_number: num,
    recall_title: title,
    product_name: product?.Name != null ? String(product.Name).trim() || null : null,
    product_type:
      product?.Type != null && String(product.Type).trim()
        ? String(product.Type).trim()
        : product?.Description != null && String(product.Description).trim()
          ? String(product.Description).trim()
          : null,
    hazard: hazardText || null,
    recall_date: parseIsoDate(item.RecallDate),
    last_publish_date: parseIsoDate(item.LastPublishDate),
    image_url: img?.URL != null && String(img.URL).trim() ? String(img.URL).trim() : null,
  };
}

function toYmd(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve date window for API query.
 * @returns {{ recallDateStart: string, recallDateEnd: string } | { error: string }}
 */
export function resolveCpscDateWindow(body) {
  const rawStart = body?.recallDateStart != null ? String(body.recallDateStart).trim() : '';
  const rawEnd = body?.recallDateEnd != null ? String(body.recallDateEnd).trim() : '';

  if (rawStart && rawEnd) {
    const start = new Date(`${rawStart}T00:00:00Z`);
    const end = new Date(`${rawEnd}T23:59:59Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { error: 'Invalid recallDateStart / recallDateEnd' };
    }
    if (end < start) {
      return { error: 'recallDateEnd must be on or after recallDateStart' };
    }
    const days = (end - start) / (86400 * 1000);
    if (days > MAX_RANGE_DAYS) {
      return { error: `Date range too large (max ${MAX_RANGE_DAYS} days)` };
    }
    return { recallDateStart: rawStart, recallDateEnd: rawEnd };
  }

  if (rawStart || rawEnd) {
    return { error: 'Provide both recallDateStart and recallDateEnd, or leave both empty for defaults' };
  }

  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - DEFAULT_RANGE_DAYS);
  return { recallDateStart: toYmd(start), recallDateEnd: toYmd(end) };
}

/**
 * Fetch recalls from CPSC JSON API.
 * @param {{ recallNumber?: string, recallDateStart?: string, recallDateEnd?: string }} query
 */
export async function fetchCpscRecallsJson(query) {
  const params = new URLSearchParams();
  params.set('format', 'json');

  const num = query.recallNumber?.trim();
  if (num) {
    params.set('RecallNumber', num.replace(/\D/g, ''));
  } else {
    params.set('RecallDateStart', query.recallDateStart);
    params.set('RecallDateEnd', query.recallDateEnd);
  }

  const url = `${CPSC_RECALL_API}?${params.toString()}`;
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`CPSC API HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('CPSC API returned unexpected JSON (expected array)');
  }
  if (data.length > MAX_RECALLS) {
    throw new Error(`Too many recalls (${data.length}); narrow the date range or use recall number`);
  }
  return { url, items: data };
}

/**
 * Map API items to DB rows; drops rows without a usable recall_number.
 */
export function cpscItemsToRecallRecords(items) {
  const records = [];
  const skipped = [];
  for (const item of items) {
    const rec = mapCpscJsonItemToRecallRecord(item);
    if (!rec.recall_number) {
      skipped.push({ reason: 'Missing RecallNumber', recallId: item?.RecallID });
      continue;
    }
    records.push(rec);
  }
  return { records, skipped };
}
