import { Router } from 'express';
import { applyApiMockUser, requireInvestigatorOrAdmin } from '../middleware/requireCpscManager.js';
import { searchSerpApi, searchEbay } from '../lib/serpApi.js';
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
      .select('product_name, recall_title, manufacturer, model_number, upc')
      .eq('recall_id', recallId)
      .maybeSingle();

    if (recallError) throw recallError;
    if (!recall) return res.status(404).json({ error: `Recall ${recallId} not found` });

    // Build a precise search query.
    // Priority: UPC (definitive) > quoted brand + model (exact phrase) > quoted brand + name
    // Quoting ensures Google Shopping anchors to the specific brand/model rather than
    // matching on generic product-type words like "spiral tower".
    let shoppingQuery;
    if (recall.upc) {
      shoppingQuery = String(recall.upc).trim();
    } else if (recall.model_number) {
      const parts = [];
      if (recall.manufacturer) parts.push(`"${recall.manufacturer}"`);
      parts.push(`"${recall.model_number}"`);
      shoppingQuery = parts.join(' ');
    } else {
      const name = (recall.product_name || recall.recall_title || '').trim();
      shoppingQuery = recall.manufacturer ? `"${recall.manufacturer}" ${name}` : name;
    }

    // eBay query — recalled products are often removed from Amazon/Walmart but
    // continue to be listed on eBay. Use model number or brand + name (no quotes;
    // eBay's keyword search is less sensitive to exact phrase syntax).
    const ebayQuery = recall.model_number
      ? `${recall.manufacturer || ''} ${recall.model_number}`.trim()
      : `${recall.manufacturer || ''} ${recall.product_name || recall.recall_title || ''}`.trim();

    // Run Google Shopping + eBay searches in parallel
    let serpResults;
    try {
      const [shoppingResults, ebayResults] = await Promise.allSettled([
        searchSerpApi(shoppingQuery, 10),
        searchEbay(ebayQuery, 10),
      ]);

      const shopping = shoppingResults.status === 'fulfilled' ? shoppingResults.value : [];
      const ebay    = ebayResults.status    === 'fulfilled' ? ebayResults.value    : [];
      if (shoppingResults.status === 'rejected') {
        console.warn('Google Shopping search failed:', shoppingResults.reason?.message);
      }
      if (ebayResults.status === 'rejected') {
        console.warn('eBay search failed:', ebayResults.reason?.message);
      }

      // Merge + deduplicate by URL
      const seen = new Set();
      serpResults = [...shopping, ...ebay].filter((r) => {
        if (!r.url || seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });
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

    if (serpResults.length === 0) {
      return res.json({ recall_id: recallId, cached: false, results: [] });
    }

    // Resolve the user ID for saving results
    const userId = await dbResolveAppUserId(req.supabase, req.user?.email, req.user?.id);

    // Pre-filter: if we know the manufacturer, skip Firecrawl for any result whose
    // SerpAPI title shares no significant word with the manufacturer name.
    // This avoids burning Firecrawl credits on obviously wrong results (e.g. a generic
    // "Kids Stacking Tower" when the brand is "Beestech").
    const brandWords = recall.manufacturer
      ? recall.manufacturer.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
      : [];

    function titleLikelyMatchesBrand(title) {
      if (brandWords.length === 0) return true;
      const t = title.toLowerCase();
      return brandWords.some((w) => t.includes(w));
    }

    // Scrape each result and score it — up to 5 concurrent Firecrawl requests.
    // Results whose title has no brand overlap are scored from the SerpAPI title alone
    // (no Firecrawl call) to conserve API credits.
    const SCRAPE_CONCURRENCY = 5;
    const recallData = {
      product_name: recall.product_name || recall.recall_title,
      manufacturer: recall.manufacturer,
      model_number: recall.model_number ?? null,
    };

    // Partition: only scrape results that plausibly mention the brand
    const toScrape    = serpResults.filter((r) => titleLikelyMatchesBrand(r.title));
    const skipScrape  = serpResults.filter((r) => !titleLikelyMatchesBrand(r.title));

    if (skipScrape.length > 0) {
      console.log(`Discovery: skipping Firecrawl for ${skipScrape.length} result(s) with no brand overlap`);
    }

    // Worker-pool pattern: N workers pull from a shared index, preserving result order
    const scrapeOutcomes = new Array(toScrape.length);
    let scrapeIdx = 0;
    async function scrapeWorker() {
      while (scrapeIdx < toScrape.length) {
        const i = scrapeIdx++;
        const result = toScrape[i];
        try {
          scrapeOutcomes[i] = { ok: true, data: await scrapeAndExtract(result.url) };
        } catch (err) {
          console.warn(`Discovery scrape failed for ${result.url}:`, err.message);
          scrapeOutcomes[i] = { ok: false, data: { product_name: result.title || null } };
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(SCRAPE_CONCURRENCY, toScrape.length) }, scrapeWorker),
    );

    let scrapeFailures = 0;

    // Score scraped results
    const scoredScraped = toScrape.map((result, i) => {
      const outcome = scrapeOutcomes[i];
      if (!outcome.ok) scrapeFailures++;
      const scraped = outcome.data;
      const scored = scoreMatch(scraped, recallData);
      return {
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
      };
    });

    // Score skipped results using only the SerpAPI title (no Firecrawl data)
    const scoredSkipped = skipScrape.map((result) => {
      const scraped = { product_name: result.title || null };
      const scored = scoreMatch(scraped, recallData);
      return {
        recall_id: recallId,
        user_id: userId,
        listing_url: result.url,
        listing_title: result.title ?? null,
        marketplace: result.marketplace ?? null,
        price: result.price ?? null,
        scraped_product_name: scraped.product_name ?? null,
        scraped_manufacturer: null,
        scraped_model_number: null,
        confidence_tier: scored.tier,
        confidence_score: scored.score,
      };
    });

    const scoredResults = [...scoredScraped, ...scoredSkipped];

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
