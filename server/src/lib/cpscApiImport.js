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

function parseDateOnly(value) {
  const iso = parseIsoDate(value);
  return iso ? iso.slice(0, 10) : null;
}

function firstStringFromArray(arr, key) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const v = arr[0]?.[key];
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function firstNonEmptyStringFromArray(arr, key) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  for (const obj of arr) {
    const v = obj?.[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function trimToMax(value, max) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (typeof max === 'number' && max > 0 && s.length > max) return s.slice(0, max);
  return s;
}

/**
 * Map one CPSC JSON recall object to public.recall row shape.
 * @param {Record<string, unknown>} item
 */
export function mapCpscJsonItemToRecallRecord(item) {
  // Many existing Supabase schemas use varchar(255) for several recall columns.
  // Keep imports robust even before migrations widen them to TEXT.
  const V255 = 255;
  const INT4_MAX = 2_147_483_647;

  const num = trimToMax(normalizeRecallNumber(item.RecallNumber), V255) ?? '';
  const img = Array.isArray(item.Images) ? item.Images[0] : null;
  const rawTitle =
    item.Title != null && String(item.Title).trim()
      ? String(item.Title).trim()
      : String(item.Description ?? 'Recall');
  const title = trimToMax(rawTitle, V255) ?? 'Recall';

  return {
    recall_number: num,
    recall_title: title,
    recall_url: trimToMax(item.URL, 4000),
    consumer_contact:
      trimToMax(item.ConsumerContact, 4000),
    recall_description:
      trimToMax(item.Description, 40000),
    hazard: firstNonEmptyStringFromArray(item.Hazards, 'Name'),
    injury: firstNonEmptyStringFromArray(item.Injuries, 'Name'),
    remedy: firstNonEmptyStringFromArray(item.Remedies, 'Name'),
    remedy_option: trimToMax(firstStringFromArray(item.RemedyOptions, 'Option'), V255),
    manufacturer: trimToMax(firstNonEmptyStringFromArray(item.Manufacturers, 'Name'), V255),
    manufacturer_country: trimToMax(firstStringFromArray(item.ManufacturerCountries, 'Country'), V255),
    importer: trimToMax(firstNonEmptyStringFromArray(item.Importers, 'Name'), V255),
    distributor: trimToMax(firstNonEmptyStringFromArray(item.Distributors, 'Name'), V255),
    retailer: trimToMax(firstNonEmptyStringFromArray(item.Retailers, 'Name'), V255),
    upc: trimToMax(firstNonEmptyStringFromArray(item.ProductUPCs, 'UPC'), V255),
    product_name: trimToMax(firstNonEmptyStringFromArray(item.Products, 'Name'), V255),
    product_type:
      trimToMax(
        firstNonEmptyStringFromArray(item.Products, 'Type') ??
          firstNonEmptyStringFromArray(item.Products, 'Description'),
        V255,
      ),
    number_of_units: (() => {
      const raw = firstNonEmptyStringFromArray(item.Products, 'NumberOfUnits');
      if (!raw) return null;
      const digits = raw.replace(/[^\d]/g, '');
      if (!digits) return null;
      // Some CPSC records contain malformed NumberOfUnits values (e.g. UPC-like identifiers).
      // Guard against int4 overflow and treat suspiciously large values as unknown.
      if (digits.length >= 10) return null;
      const n = Number.parseInt(digits, 10);
      if (!Number.isFinite(n)) return null;
      if (n > INT4_MAX) return null;
      return n;
    })(),
    recall_date: parseDateOnly(item.RecallDate),
    last_publish_date: parseDateOnly(item.LastPublishDate),
    /** Synced to public.recall_image after recall upsert (not a recall column on main DB). */
    image_url: trimToMax(img?.URL, 4000),
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
