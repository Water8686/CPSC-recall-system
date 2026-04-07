import { Router } from 'express';
import { applyApiMockUser, requireInvestigatorOrAdmin } from '../middleware/requireCpscManager.js';
import { searchSerpApi } from '../lib/serpApi.js';
import { scrapeAndExtract } from '../lib/firecrawlApi.js';
import { scoreMatch } from '../lib/matchScoring.js';
import {
  dbFetchDiscoveryResults,
  dbCheckDiscoveryCache,
  dbSaveDiscoveryResults,
  dbUpdateDiscoveryReview,
} from '../lib/supabaseDiscoveryData.js';
import { dbResolveAppUserId } from '../lib/supabaseRecallData.js';

const router = Router();
router.use(applyApiMockUser);

const VALID_REVIEW_STATUSES = ['Pending Review', 'Confirmed Match', 'Rejected'];

/** POST /api/discovery/search — Run discovery pipeline for a recall */
router.post('/search', requireInvestigatorOrAdmin, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const { recall_id } = req.body ?? {};
  if (!recall_id) return res.status(400).json({ error: 'recall_id is required' });

  const force = req.query.force === 'true';
  const recallId = Number(recall_id);
  if (!Number.isFinite(recallId)) return res.status(400).json({ error: 'Invalid recall_id' });

  try {
    // Check 7-day cache unless force=true
    if (!force) {
      const cachedAt = await dbCheckDiscoveryCache(req.supabase, recallId);
      if (cachedAt) {
        const results = await dbFetchDiscoveryResults(req.supabase, recallId);
        return res.json({ recall_id: recallId, cached: true, cached_at: cachedAt, results });
      }
    }

    // Fetch recall data for building the search query
    const { data: recall, error: recallError } = await req.supabase
      .from('recall')
      .select('product_name, recall_title, manufacturer, model_number')
      .eq('recall_id', recallId)
      .maybeSingle();

    if (recallError) throw recallError;
    if (!recall) return res.status(404).json({ error: `Recall ${recallId} not found` });

    // Build search query from recall fields
    const queryParts = [recall.product_name || recall.recall_title, recall.manufacturer, recall.model_number]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0);
    const query = queryParts.join(' ');

    // Run SerpAPI search
    let serpResults;
    try {
      serpResults = await searchSerpApi(query);
    } catch (err) {
      if (err.message?.includes('SERPAPI_KEY')) {
        return res.json({
          recall_id: recallId,
          results: [],
          warning: 'SerpAPI key not configured. Set SERPAPI_KEY in Railway environment variables.',
        });
      }
      throw err;
    }

    // Resolve the user ID for saving results
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);

    // Scrape each result and score it
    let scrapeFailures = 0;
    const scoredResults = [];
    const recallData = {
      product_name: recall.product_name || recall.recall_title,
      manufacturer: recall.manufacturer,
      model_number: recall.model_number ?? null,
    };

    for (const result of serpResults) {
      let scraped;
      try {
        scraped = await scrapeAndExtract(result.url);
      } catch (err) {
        console.warn(`Discovery scrape failed for ${result.url}:`, err.message);
        scrapeFailures++;
        scraped = { product_name: result.title || null };
      }

      const scored = scoreMatch(scraped, recallData);
      scoredResults.push({
        recall_id: recallId,
        user_id: userId,
        listing_url: result.url,
        listing_title: result.title ?? scraped.title ?? null,
        marketplace: result.marketplace ?? scraped.marketplace ?? null,
        price: result.price ?? scraped.price ?? null,
        scraped_product_name: scraped.product_name ?? null,
        scraped_manufacturer: scraped.manufacturer ?? null,
        scraped_model_number: scraped.model_number ?? null,
        confidence_tier: scored.tier,
        confidence_score: scored.score,
      });
    }

    // Persist all scored results
    const saved = await dbSaveDiscoveryResults(req.supabase, scoredResults);

    const response = { recall_id: recallId, cached: false, results: saved };
    if (scrapeFailures > 0) {
      response.scrape_failures = scrapeFailures;
    }
    return res.json(response);
  } catch (err) {
    console.error('POST /discovery/search:', err);
    return res.status(500).json({ error: err.message || 'Discovery pipeline failed' });
  }
});

/** GET /api/discovery/:recall_id — Fetch existing discovery results */
router.get('/:recall_id', requireInvestigatorOrAdmin, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const recallId = Number(req.params.recall_id);
  if (!Number.isFinite(recallId)) return res.status(400).json({ error: 'Invalid recall_id' });

  const filters = {};
  if (req.query.review_status) filters.review_status = String(req.query.review_status);
  if (req.query.confidence_tier) filters.confidence_tier = String(req.query.confidence_tier);

  try {
    const results = await dbFetchDiscoveryResults(req.supabase, recallId, filters);
    return res.json({ results });
  } catch (err) {
    console.error('GET /discovery/:recall_id:', err);
    return res.status(500).json({ error: err.message || 'Failed to load discovery results' });
  }
});

/** PATCH /api/discovery/:discovery_id — Update review status */
router.patch('/:discovery_id', requireInvestigatorOrAdmin, async (req, res) => {
  if (!req.supabase) return res.status(503).json({ error: 'Database not available' });

  const discoveryId = req.params.discovery_id;
  if (!discoveryId) return res.status(400).json({ error: 'Invalid discovery_id' });

  const { review_status, reviewer_notes } = req.body ?? {};

  if (review_status && !VALID_REVIEW_STATUSES.includes(review_status)) {
    return res.status(400).json({
      error: `review_status must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`,
    });
  }

  try {
    const row = await dbUpdateDiscoveryReview(req.supabase, discoveryId, {
      review_status,
      reviewer_notes: reviewer_notes ?? undefined,
    });
    return res.json(row);
  } catch (err) {
    console.error('PATCH /discovery/:discovery_id:', err);
    return res.status(500).json({ error: err.message || 'Failed to update discovery result' });
  }
});

export default router;
