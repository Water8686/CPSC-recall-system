/**
 * DB helpers for the Smart Listing Discovery feature.
 * CRUD operations on the discovery_result table.
 */

const DISCOVERY_SELECT = `
  discovery_id, recall_id, user_id, listing_url, listing_title,
  marketplace, price, scraped_product_name, scraped_manufacturer,
  scraped_model_number, confidence_tier, confidence_score,
  review_status, reviewer_notes, searched_at, reviewed_at
`;

/**
 * Fetch discovery results for a recall.
 * @param {object} supabase - Supabase client
 * @param {number} recallId
 * @param {{ review_status?: string, confidence_tier?: string }} filters
 */
export async function dbFetchDiscoveryResults(supabase, recallId, filters = {}) {
  let q = supabase
    .from('discovery_result')
    .select(DISCOVERY_SELECT)
    .eq('recall_id', recallId)
    .order('confidence_score', { ascending: false });

  if (filters.review_status) {
    q = q.eq('review_status', filters.review_status);
  }
  if (filters.confidence_tier) {
    q = q.eq('confidence_tier', filters.confidence_tier);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/**
 * Check if a recall was searched within the cache window (default 7 days).
 * Returns the most recent searched_at timestamp if cached, or null.
 */
export async function dbCheckDiscoveryCache(supabase, recallId, cacheDays = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cacheDays);

  const { data, error } = await supabase
    .from('discovery_result')
    .select('searched_at')
    .eq('recall_id', recallId)
    .gte('searched_at', cutoff.toISOString())
    .order('searched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.searched_at ?? null;
}

/**
 * Save a batch of discovery results using a single upsert on the
 * (recall_id, listing_url) unique constraint.
 *
 * review_status / reviewer_notes / reviewed_at are intentionally excluded
 * from the upsert payload so that a re-search never resets a reviewer's work.
 * New rows receive review_status = 'Pending Review' from the column default.
 */
export async function dbSaveDiscoveryResults(supabase, results) {
  if (!results.length) return [];

  const searchedAt = new Date().toISOString();
  const rows = results.map((r) => ({
    recall_id:            r.recall_id,
    user_id:              r.user_id,
    listing_url:          r.listing_url,
    listing_title:        r.listing_title,
    marketplace:          r.marketplace,
    price:                r.price,
    scraped_product_name: r.scraped_product_name,
    scraped_manufacturer: r.scraped_manufacturer,
    scraped_model_number: r.scraped_model_number,
    confidence_tier:      r.confidence_tier,
    confidence_score:     r.confidence_score,
    searched_at:          searchedAt,
  }));

  const { data, error } = await supabase
    .from('discovery_result')
    .upsert(rows, { onConflict: 'recall_id,listing_url' })
    .select(DISCOVERY_SELECT);

  if (error) throw error;
  return data ?? [];
}

/**
 * Update the review status of a discovery result.
 */
export async function dbUpdateDiscoveryReview(supabase, discoveryId, fields) {
  const patch = {};
  if (fields.review_status !== undefined) patch.review_status = fields.review_status;
  if (fields.reviewer_notes !== undefined) patch.reviewer_notes = fields.reviewer_notes;
  patch.reviewed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('discovery_result')
    .update(patch)
    .eq('discovery_id', discoveryId)
    .select(DISCOVERY_SELECT)
    .single();
  if (error) throw error;
  return data;
}
