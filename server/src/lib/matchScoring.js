/**
 * Weighted fuzzy matching for product verification.
 *
 * Compares scraped listing data against recall data using Dice's coefficient.
 * Fields: model_number (weight 50), manufacturer (30), product_name (20).
 * Returns a score (0-100) and a confidence tier (High / Uncertain / No Match).
 */

import { compareTwoStrings } from 'string-similarity';

const FIELD_WEIGHTS = [
  { key: 'model_number',  weight: 50 },
  { key: 'manufacturer',  weight: 30 },
  { key: 'product_name',  weight: 20 },
];

/**
 * Compute similarity between two strings (0-1). Case-insensitive.
 * Returns 0 if either value is null/empty.
 */
export function computeSimilarity(a, b) {
  if (!a || !b) return 0;
  const sa = String(a).trim().toLowerCase();
  const sb = String(b).trim().toLowerCase();
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
    const sim = computeSimilarity(scraped[f.key], recall[f.key]);
    score += sim * f.weight * scale;
  }

  score = Math.round(score * 100) / 100;

  let tier;
  if (score >= 60) tier = 'High';
  else if (score >= 25) tier = 'Uncertain';
  else tier = 'No Match';

  return { score, tier };
}
