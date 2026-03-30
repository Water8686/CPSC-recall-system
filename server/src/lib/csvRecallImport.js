/**
 * Parse CSV text into recall rows for public.recall upsert (batch import — metric 14).
 * Images are stored in public.recall_image (see recallImages.js).
 */
import { parse } from 'csv-parse/sync';
import { syncRecallImagesAfterUpsert } from './recallImages.js';

const MAX_ROWS = 5000;

/** Normalize header cell to a canonical key. */
function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/** Map flexible header names to DB columns. */
function canonicalKey(header) {
  const h = normalizeHeader(header);
  const map = {
    recall_number: 'recall_number',
    recall_no: 'recall_number',
    recall_id: 'recall_number',
    id: 'recall_number',
    recall_title: 'recall_title',
    title: 'recall_title',
    product_name: 'product_name',
    product: 'product_name',
    product_type: 'product_type',
    type: 'product_type',
    hazard: 'hazard',
    recall_date: 'recall_date',
    last_publish_date: 'last_publish_date',
    published: 'last_publish_date',
    image_url: 'image_url',
    image: 'image_url',
    photo: 'image_url',
  };
  return map[h] ?? null;
}

function parseDate(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: "${s}"`);
  }
  return d.toISOString();
}

/**
 * @param {string} csvText
 * @returns {{ records: object[], rowErrors: { row: number, message: string }[] }}
 */
export function parseRecallCsv(csvText) {
  const rowErrors = [];
  if (!csvText || !String(csvText).trim()) {
    return { records: [], rowErrors: [{ row: 0, message: 'Empty file' }] };
  }

  let rows;
  try {
    rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (e) {
    return {
      records: [],
      rowErrors: [{ row: 0, message: e.message || 'CSV parse failed' }],
    };
  }

  if (rows.length > MAX_ROWS) {
    return {
      records: [],
      rowErrors: [{ row: 0, message: `Too many rows (max ${MAX_ROWS})` }],
    };
  }

  const records = [];
  rows.forEach((raw, i) => {
    const line = i + 2; // header + 1-based
    const row = {};
    for (const [k, v] of Object.entries(raw)) {
      const canon = canonicalKey(k);
      if (canon) row[canon] = v == null ? '' : String(v).trim();
    }

    if (!row.recall_number) {
      rowErrors.push({ row: line, message: 'Missing recall_number' });
      return;
    }

    try {
      const rec = {
        recall_number: row.recall_number,
        recall_title: row.recall_title || null,
        product_name: row.product_name || null,
        product_type: row.product_type || null,
        hazard: row.hazard || null,
        recall_date: parseDate(row.recall_date),
        last_publish_date: parseDate(row.last_publish_date),
        image_url: row.image_url?.trim() || null,
      };
      records.push(rec);
    } catch (e) {
      rowErrors.push({ row: line, message: e.message || 'Invalid row' });
    }
  });

  return { records, rowErrors };
}

function recallRowForUpsert(record) {
  const { image_url: _img, ...rest } = record;
  return rest;
}

/**
 * Upsert recall records in batches.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function upsertRecallRecords(supabase, records) {
  const failed = [];
  let upserted = 0;
  const chunkSize = 100;

  for (let i = 0; i < records.length; i += chunkSize) {
    const slice = records.slice(i, i + chunkSize);
    const chunk = slice.map(recallRowForUpsert);
    const { error } = await supabase.from('recall').upsert(chunk, {
      onConflict: 'recall_number',
    });
    if (error) {
      for (const r of chunk) {
        failed.push({ recall_number: r.recall_number, message: error.message });
      }
    } else {
      upserted += chunk.length;
      await syncRecallImagesAfterUpsert(supabase, slice);
    }
  }

  return { upserted, failed };
}
