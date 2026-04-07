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
 * Save a batch of discovery results. Upserts by (recall_id, listing_url)
 * to avoid duplicates on re-search.
 */
export async function dbSaveDiscoveryResults(supabase, results) {
  if (!results.length) return [];

  const saved = [];
  for (const r of results) {
    // Check for existing result with same recall_id + listing_url
    const { data: existing } = await supabase
      .from('discovery_result')
      .select('discovery_id')
      .eq('recall_id', r.recall_id)
      .eq('listing_url', r.listing_url)
      .maybeSingle();

    if (existing) {
      // Update existing record (re-search refreshes scraped data + scores)
      const { data, error } = await supabase
        .from('discovery_result')
        .update({
          listing_title:        r.listing_title,
          marketplace:          r.marketplace,
          price:                r.price,
          scraped_product_name: r.scraped_product_name,
          scraped_manufacturer: r.scraped_manufacturer,
          scraped_model_number: r.scraped_model_number,
          confidence_tier:      r.confidence_tier,
          confidence_score:     r.confidence_score,
          searched_at:          new Date().toISOString(),
        })
        .eq('discovery_id', existing.discovery_id)
        .select(DISCOVERY_SELECT)
        .single();
      if (error) throw error;
      saved.push(data);
    } else {
      const { data, error } = await supabase
        .from('discovery_result')
        .insert({
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
          review_status:        'Pending Review',
          searched_at:          new Date().toISOString(),
        })
        .select(DISCOVERY_SELECT)
        .single();
      if (error) throw error;
      saved.push(data);
    }
  }
  return saved;
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
