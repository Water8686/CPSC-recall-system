/**
 * Weighted fuzzy matching for product verification.
 *
 * Compares scraped listing data against recall data using Dice's coefficient.
 * Fields: model_number (weight 50), manufacturer (30), product_name (20).
 * Returns a score (0-100) and a confidence tier (High / Uncertain / No Match).
 */

import { compareTwoStrings } from 'string-similarity';

const FIELD_WEIGHTS = [
  { key: 'model_number',  weight: 50, normalize: true },
  { key: 'manufacturer',  weight: 30, normalize: false },
  { key: 'product_name',  weight: 20, normalize: false },
];

/**
 * Normalize a model number for comparison: strip all non-alphanumeric chars.
 * "XB-100" → "xb100", "XB 100" → "xb100", "XB100" → "xb100"
 */
function normalizeModel(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Compute similarity between two strings (0-1). Case-insensitive.
 * Pass normalize=true for model numbers to strip dashes, spaces, etc. before comparing.
 * Returns 0 if either value is null/empty.
 */
export function computeSimilarity(a, b, normalize = false) {
  if (!a || !b) return 0;
  let sa = String(a).trim().toLowerCase();
  let sb = String(b).trim().toLowerCase();
  if (normalize) {
    sa = normalizeModel(sa);
    sb = normalizeModel(sb);
  }
  if (!sa || !sb) return 0;
  if (sa === sb) return 1;
  return compareTwoStrings(sa, sb);
}

/**
 * Score a scraped listing against a recall record.
 * @param {{ product_name?: string, manufacturer?: string, model_number?: string }} scraped
 * @param {{ product_name?: string, manufacturer?: string, model_number?: string }} recall
 * @returns {{ score: number, tier: string }}
 */
export function scoreMatch(scraped, recall) {
  const active = FIELD_WEIGHTS.filter(
    (f) => recall[f.key] && scraped[f.key],
  );

  if (active.length === 0) {
    return { score: 0, tier: 'No Match' };
  }

  const totalActiveWeight = active.reduce((s, f) => s + f.weight, 0);
  const scale = 100 / totalActiveWeight;

  let score = 0;
  for (const f of active) {
    const sim = computeSimilarity(scraped[f.key], recall[f.key], f.normalize);
    score += sim * f.weight * scale;
  }

  score = Math.round(score * 100) / 100;

  let tier;
  if (score >= 60) tier = 'High';
  else if (score >= 25) tier = 'Uncertain';
  else tier = 'No Match';

  return { score, tier };
}
