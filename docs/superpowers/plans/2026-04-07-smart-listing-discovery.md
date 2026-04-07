# Smart Listing Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automated pipeline that discovers marketplace listings via SerpAPI, scrapes them with Firecrawl for product verification, and presents investigators with confidence-scored results they can confirm or reject.

**Architecture:** Sequential pipeline triggered from RecallDetailPage. SerpAPI finds candidate listings across all marketplaces, Firecrawl extracts product details from each URL, a scoring module compares extracted fields against recall data using weighted fuzzy matching, and results are persisted to a `discovery_result` table. Investigators review results and can promote confirmed matches into the existing violation workflow.

**Tech Stack:** Express.js routes, Supabase/PostgreSQL, SerpAPI (existing), Firecrawl JS SDK (`@mendable/firecrawl-js`), `string-similarity` (Dice's coefficient for fuzzy matching), React + MUI frontend.

**Spec:** `docs/superpowers/specs/2026-04-07-smart-listing-discovery-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260407160000_discovery_result.sql` | DB table for discovery results |
| Create | `server/src/lib/firecrawlApi.js` | Firecrawl scraping + LLM extraction |
| Create | `server/src/lib/matchScoring.js` | Weighted fuzzy matching & confidence tiers |
| Create | `server/src/lib/supabaseDiscoveryData.js` | CRUD for discovery_result table |
| Create | `server/src/routes/listingDiscovery.js` | REST endpoints + pipeline orchestration |
| Create | `client/src/components/DiscoveryPanel.jsx` | Discovery results UI component |
| Modify | `shared/index.js` | Add CONFIDENCE_TIERS, REVIEW_STATUSES constants |
| Modify | `server/src/app.js` | Register listingDiscovery route |
| Modify | `client/src/pages/RecallDetailPage.jsx` | Add "Discover & Verify" tab + DiscoveryPanel |

---

### Task 1: Shared Constants & Database Migration

**Files:**
- Modify: `shared/index.js`
- Create: `supabase/migrations/20260407160000_discovery_result.sql`

- [x] **Step 1: Add shared constants to `shared/index.js`**

Add at the end of the file, before the final re-export line:

```javascript
// Discovery — confidence tiers & review statuses (Smart Listing Discovery)
export const CONFIDENCE_TIERS = {
  HIGH: 'High',
  UNCERTAIN: 'Uncertain',
  NO_MATCH: 'No Match',
};

export const REVIEW_STATUSES = {
  PENDING: 'Pending Review',
  CONFIRMED: 'Confirmed Match',
  REJECTED: 'Rejected',
};
```

- [x] **Step 2: Create the migration file**

Create `supabase/migrations/20260407160000_discovery_result.sql`:

```sql
-- Smart Listing Discovery: stores SerpAPI + Firecrawl verified results
CREATE TABLE IF NOT EXISTS discovery_result (
  discovery_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_id       BIGINT NOT NULL REFERENCES recall(recall_id),
  user_id         BIGINT REFERENCES app_users(user_id),
  listing_url     TEXT NOT NULL,
  listing_title   TEXT,
  marketplace     TEXT,
  price           TEXT,
  scraped_product_name  TEXT,
  scraped_manufacturer  TEXT,
  scraped_model_number  TEXT,
  confidence_tier TEXT NOT NULL DEFAULT 'No Match'
    CHECK (confidence_tier IN ('High', 'Uncertain', 'No Match')),
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  review_status   TEXT NOT NULL DEFAULT 'Pending Review'
    CHECK (review_status IN ('Pending Review', 'Confirmed Match', 'Rejected')),
  reviewer_notes  TEXT,
  searched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at     TIMESTAMPTZ
);

-- Index for cache lookups (recall + recent searches)
CREATE INDEX IF NOT EXISTS idx_discovery_recall_searched
  ON discovery_result(recall_id, searched_at DESC);
```

- [x] **Step 3: Apply the migration to Supabase**

Run the migration SQL against the Supabase database using the Supabase MCP tool or directly in the Supabase SQL editor.

- [x] **Step 4: Commit**

```bash
git add shared/index.js supabase/migrations/20260407160000_discovery_result.sql
git commit -m "feat: add discovery_result table and shared constants"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `server/package.json` (via npm install)

- [x] **Step 1: Install string-similarity for fuzzy matching**

```bash
cd server && npm install string-similarity
```

- [x] **Step 2: Install Firecrawl JS SDK**

```bash
cd server && npm install @mendable/firecrawl-js
```

- [x] **Step 3: Verify both packages appear in `server/package.json`**

```bash
grep -E "string-similarity|firecrawl" server/package.json
```

Expected: both packages listed under `dependencies`.

- [x] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add string-similarity and firecrawl-js dependencies"
```

---

### Task 3: Match Scoring Module (TDD)

**Files:**
- Create: `server/src/lib/matchScoring.js`
- Create: `server/src/lib/__tests__/matchScoring.test.js`

This is pure logic with no external dependencies — ideal for TDD.

- [x] **Step 1: Write failing tests**

Create `server/src/lib/__tests__/matchScoring.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { scoreMatch, computeSimilarity } from '../matchScoring.js';

describe('computeSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(computeSimilarity('Fisher-Price', 'Fisher-Price')).toBe(1);
  });

  it('returns 1.0 for case-insensitive match', () => {
    expect(computeSimilarity('Fisher-Price', 'fisher-price')).toBe(1);
  });

  it('returns 0 when either string is null or empty', () => {
    expect(computeSimilarity(null, 'test')).toBe(0);
    expect(computeSimilarity('test', '')).toBe(0);
  });

  it('returns a value between 0 and 1 for partial matches', () => {
    const score = computeSimilarity('Fisher-Price Toy', 'Fisher Price Toys');
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('scoreMatch', () => {
  const recall = {
    product_name: 'Toddler Sleeper Gown',
    manufacturer: 'Fisher-Price',
    model_number: 'GKW70',
  };

  it('returns High tier when all 3 fields match closely', () => {
    const scraped = {
      product_name: 'Toddler Sleeper Gown',
      manufacturer: 'Fisher-Price',
      model_number: 'GKW70',
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('returns High tier when model + manufacturer match (score >= 60)', () => {
    const scraped = {
      product_name: 'Completely Different Name',
      manufacturer: 'Fisher-Price',
      model_number: 'GKW70',
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('returns Uncertain tier for partial match (1 field)', () => {
    const scraped = {
      product_name: 'Baby Sleeping Bag',
      manufacturer: 'Fisher-Price',
      model_number: 'XYZ999',
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('Uncertain');
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.score).toBeLessThan(60);
  });

  it('returns No Match when nothing matches', () => {
    const scraped = {
      product_name: 'Kitchen Blender Pro',
      manufacturer: 'Vitamix',
      model_number: 'A2500',
    };
    const result = scoreMatch(scraped, recall);
    expect(result.tier).toBe('No Match');
    expect(result.score).toBeLessThan(25);
  });

  it('redistributes weights when recall field is missing', () => {
    const recallNoModel = {
      product_name: 'Toddler Sleeper Gown',
      manufacturer: 'Fisher-Price',
      model_number: null,
    };
    const scraped = {
      product_name: 'Toddler Sleeper Gown',
      manufacturer: 'Fisher-Price',
      model_number: 'GKW70',
    };
    const result = scoreMatch(scraped, recallNoModel);
    expect(result.tier).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('redistributes weights when scraped field is missing', () => {
    const scraped = {
      product_name: 'Toddler Sleeper Gown',
      manufacturer: 'Fisher-Price',
      model_number: null,
    };
    const result = scoreMatch(scraped, recall);
    // model_number can't be compared, so only product_name + manufacturer count
    expect(result.tier).toBe('High');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

```bash
cd server && npx vitest run src/lib/__tests__/matchScoring.test.js
```

Expected: FAIL — module `../matchScoring.js` not found.

- [x] **Step 3: Implement the scoring module**

Create `server/src/lib/matchScoring.js`:

```javascript
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
  // Filter to fields where both sides have a value
  const active = FIELD_WEIGHTS.filter(
    (f) => recall[f.key] && scraped[f.key],
  );

  if (active.length === 0) {
    return { score: 0, tier: 'No Match' };
  }

  // Redistribute weights proportionally among active fields
  const totalActiveWeight = active.reduce((s, f) => s + f.weight, 0);
  const scale = 100 / totalActiveWeight;

  let score = 0;
  for (const f of active) {
    const sim = computeSimilarity(scraped[f.key], recall[f.key]);
    score += sim * f.weight * scale;
  }

  score = Math.round(score * 100) / 100; // 2 decimal places

  let tier;
  if (score >= 60) tier = 'High';
  else if (score >= 25) tier = 'Uncertain';
  else tier = 'No Match';

  return { score, tier };
}
```

- [x] **Step 4: Run tests to verify they pass**

```bash
cd server && npx vitest run src/lib/__tests__/matchScoring.test.js
```

Expected: all tests PASS.

- [x] **Step 5: Commit**

```bash
git add server/src/lib/matchScoring.js server/src/lib/__tests__/matchScoring.test.js
git commit -m "feat: add weighted fuzzy match scoring module with tests"
```

---

### Task 4: Firecrawl API Module

**Files:**
- Create: `server/src/lib/firecrawlApi.js`

- [x] **Step 1: Create the Firecrawl extraction module**

Create `server/src/lib/firecrawlApi.js`:

```javascript
/**
 * Firecrawl client — scrapes a URL and extracts structured product data
 * using Firecrawl's LLM extraction mode.
 *
 * Required env vars:
 *   FIRECRAWL_API_KEY — Firecrawl API key
 */

import FirecrawlApp from '@mendable/firecrawl-js';

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY is required');
    client = new FirecrawlApp({ apiKey });
  }
  return client;
}

/**
 * Scrape a URL and extract product details.
 * @param {string} url — the listing page URL
 * @returns {{ product_name: string|null, manufacturer: string|null, model_number: string|null }}
 */
export async function scrapeAndExtract(url) {
  const fc = getClient();

  const result = await fc.scrapeUrl(url, {
    formats: ['extract'],
    extract: {
      schema: {
        type: 'object',
        properties: {
          product_name: {
            type: 'string',
            description: 'The full product name or title',
          },
          manufacturer: {
            type: 'string',
            description: 'The brand or manufacturer name',
          },
          model_number: {
            type: 'string',
            description: 'The model number, part number, or SKU',
          },
        },
      },
    },
  });

  if (!result.success) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${result.error || 'unknown error'}`);
  }

  const extracted = result.extract || {};
  return {
    product_name: extracted.product_name || null,
    manufacturer: extracted.manufacturer || null,
    model_number: extracted.model_number || null,
  };
}
```

- [x] **Step 2: Manually verify the module loads without syntax errors**

```bash
cd server && node -e "import('./src/lib/firecrawlApi.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

Expected: `OK` (or `FIRECRAWL_API_KEY is required` if env var isn't set — both are fine, means the module loads).

- [x] **Step 3: Commit**

```bash
git add server/src/lib/firecrawlApi.js
git commit -m "feat: add Firecrawl API module for product extraction"
```

---

### Task 5: Discovery Data Layer

**Files:**
- Create: `server/src/lib/supabaseDiscoveryData.js`

- [x] **Step 1: Create the discovery data access module**

Create `server/src/lib/supabaseDiscoveryData.js`:

```javascript
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
```

- [x] **Step 2: Commit**

```bash
git add server/src/lib/supabaseDiscoveryData.js
git commit -m "feat: add discovery_result data layer (CRUD + cache check)"
```

---

### Task 6: Discovery API Routes + App Registration

**Files:**
- Create: `server/src/routes/listingDiscovery.js`
- Modify: `server/src/app.js`

- [x] **Step 1: Create the discovery route file**

Create `server/src/routes/listingDiscovery.js`:

```javascript
import { Router } from 'express';
import {
  applyApiMockUser,
  requireInvestigatorOrAdmin,
} from '../middleware/requireCpscManager.js';
import { searchSerpApi } from '../lib/serpApi.js';
import { scrapeAndExtract } from '../lib/firecrawlApi.js';
import { scoreMatch } from '../lib/matchScoring.js';
import {
  dbFetchDiscoveryResults,
  dbCheckDiscoveryCache,
  dbSaveDiscoveryResults,
  dbUpdateDiscoveryReview,
} from '../lib/supabaseDiscoveryData.js';
import { dbResolveAppUserId } from '../middleware/requireCpscManager.js';

const router = Router();
router.use(applyApiMockUser);

/**
 * POST /api/discovery/search
 * Run the full discovery pipeline: SerpAPI → Firecrawl → score → save.
 */
router.post('/search', requireInvestigatorOrAdmin, async (req, res) => {
  const { recall_id } = req.body ?? {};
  if (!recall_id) {
    return res.status(400).json({ error: 'recall_id is required' });
  }

  const force = req.query.force === 'true';
  const supabase = req.supabase;

  try {
    // Resolve investigator user ID
    const userId = await dbResolveAppUserId(supabase, req.user);

    // Check cache (skip if force=true)
    if (!force) {
      const cachedAt = await dbCheckDiscoveryCache(supabase, recall_id);
      if (cachedAt) {
        const cached = await dbFetchDiscoveryResults(supabase, recall_id);
        return res.json({
          recall_id,
          results: cached,
          cached: true,
          cached_at: cachedAt,
        });
      }
    }

    // Fetch recall data for verification
    const { data: recall, error: recallErr } = await supabase
      .from('recall')
      .select('recall_id, product_name, manufacturer, model_number, recall_title')
      .eq('recall_id', recall_id)
      .maybeSingle();
    if (recallErr) throw recallErr;
    if (!recall) {
      return res.status(404).json({ error: 'Recall not found' });
    }

    // Build search query from recall data
    const queryParts = [
      recall.product_name || recall.recall_title,
      recall.manufacturer,
    ].filter(Boolean);
    const query = queryParts.join(' ');

    if (!query.trim()) {
      return res.status(400).json({ error: 'Recall has no product name or manufacturer to search' });
    }

    // Step 1: SerpAPI discovery
    let serpResults;
    try {
      serpResults = await searchSerpApi(query);
    } catch (err) {
      if (err.message.includes('SERPAPI_KEY')) {
        return res.json({
          recall_id,
          results: [],
          warning: 'SerpAPI key not configured. Set SERPAPI_KEY in environment variables.',
        });
      }
      throw err;
    }

    if (serpResults.length === 0) {
      // Save empty search timestamp for cache
      return res.json({ recall_id, results: [], cached: false });
    }

    // Step 2 & 3: Firecrawl extraction + scoring for each result
    const recallData = {
      product_name: recall.product_name || null,
      manufacturer: recall.manufacturer || null,
      model_number: recall.model_number || null,
    };

    const discoveryResults = [];
    let scrapeFailures = 0;

    for (const candidate of serpResults) {
      if (!candidate.url) continue;

      let scraped = { product_name: null, manufacturer: null, model_number: null };
      try {
        scraped = await scrapeAndExtract(candidate.url);
      } catch (err) {
        console.error(`Firecrawl failed for ${candidate.url}:`, err.message);
        scrapeFailures++;
        // Still score using SerpAPI title as product_name fallback
        scraped.product_name = candidate.title || null;
      }

      const { score, tier } = scoreMatch(scraped, recallData);

      discoveryResults.push({
        recall_id,
        user_id: userId,
        listing_url: candidate.url,
        listing_title: candidate.title || null,
        marketplace: candidate.marketplace || 'Other',
        price: candidate.price != null ? String(candidate.price) : null,
        scraped_product_name: scraped.product_name,
        scraped_manufacturer: scraped.manufacturer,
        scraped_model_number: scraped.model_number,
        confidence_tier: tier,
        confidence_score: score,
      });
    }

    // Step 4: Save to database
    const saved = await dbSaveDiscoveryResults(supabase, discoveryResults);

    const response = { recall_id, results: saved, cached: false };
    if (scrapeFailures > 0) {
      response.warning = `${scrapeFailures} of ${serpResults.length} listings could not be verified.`;
    }
    return res.json(response);
  } catch (err) {
    console.error('POST /discovery/search:', err);
    return res.status(500).json({ error: err.message || 'Discovery search failed' });
  }
});

/**
 * GET /api/discovery/:recall_id
 * Fetch all discovery results for a recall.
 */
router.get('/:recall_id', requireInvestigatorOrAdmin, async (req, res) => {
  const { recall_id } = req.params;
  const { review_status, confidence_tier } = req.query;

  try {
    const results = await dbFetchDiscoveryResults(
      req.supabase,
      recall_id,
      { review_status, confidence_tier },
    );
    return res.json(results);
  } catch (err) {
    console.error('GET /discovery/:recall_id:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch discovery results' });
  }
});

/**
 * PATCH /api/discovery/:discovery_id
 * Update review status of a discovery result.
 */
router.patch('/:discovery_id', requireInvestigatorOrAdmin, async (req, res) => {
  const { discovery_id } = req.params;
  const { review_status, reviewer_notes } = req.body ?? {};

  const validStatuses = ['Pending Review', 'Confirmed Match', 'Rejected'];
  if (review_status && !validStatuses.includes(review_status)) {
    return res.status(400).json({
      error: `review_status must be one of: ${validStatuses.join(', ')}`,
    });
  }

  try {
    const updated = await dbUpdateDiscoveryReview(req.supabase, discovery_id, {
      review_status,
      reviewer_notes,
    });
    return res.json(updated);
  } catch (err) {
    console.error('PATCH /discovery/:discovery_id:', err);
    return res.status(500).json({ error: err.message || 'Failed to update review' });
  }
});

export default router;
```

- [x] **Step 2: Check how `dbResolveAppUserId` is exported**

Before the route file will work, verify that `dbResolveAppUserId` is exported from the middleware file. Read `server/src/middleware/requireCpscManager.js` and check for the export. If it's not exported from there, find where it lives and update the import in the route file accordingly.

The function resolves the app_users UUID from the JWT user object. If it doesn't exist as a standalone export, use this fallback in the route:

```javascript
// Fallback: resolve user ID inline
const userId = req.user?.id ?? null;
```

- [x] **Step 3: Register the route in `server/src/app.js`**

Add the import at the top of `server/src/app.js` with the other route imports:

```javascript
import listingDiscoveryRoutes from './routes/listingDiscovery.js';
```

Add the route registration after the `listingSearchRoutes` line (line 51):

```javascript
app.use('/api/discovery', listingDiscoveryRoutes);
```

- [x] **Step 4: Verify the server starts without errors**

```bash
cd server && node -e "import('./src/app.js').then(m => { const app = m.createApp(); console.log('Server app created OK'); }).catch(e => console.error(e))"
```

Expected: `Server app created OK`

- [x] **Step 5: Commit**

```bash
git add server/src/routes/listingDiscovery.js server/src/app.js
git commit -m "feat: add discovery API routes and register in app"
```

---

### Task 7: Frontend — DiscoveryPanel Component

**Files:**
- Create: `client/src/components/DiscoveryPanel.jsx`

- [x] **Step 1: Create the DiscoveryPanel component**

Create `client/src/components/DiscoveryPanel.jsx`:

```jsx
import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { CONFIDENCE_TIERS, REVIEW_STATUSES } from 'shared';

const TIER_COLORS = {
  [CONFIDENCE_TIERS.HIGH]: 'success',
  [CONFIDENCE_TIERS.UNCERTAIN]: 'warning',
  [CONFIDENCE_TIERS.NO_MATCH]: 'error',
};

const STATUS_COLORS = {
  [REVIEW_STATUSES.PENDING]: 'default',
  [REVIEW_STATUSES.CONFIRMED]: 'success',
  [REVIEW_STATUSES.REJECTED]: 'error',
};

export default function DiscoveryPanel({ recallId, onCreateViolation }) {
  const { session } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters
  const [tierFilter, setTierFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  // Review dialog
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  async function handleDiscover(force = false) {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const url = `/api/discovery/search${force ? '?force=true' : ''}`;
      const res = await apiFetch(url, session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: recallId }),
      });
      if (!res.ok) {
        setError(await getApiErrorMessage(res, 'Discovery search failed'));
        return;
      }
      const data = await res.json();
      setResults(data.results || []);
      setCachedAt(data.cached_at || null);
      setHasSearched(true);
      if (data.warning) setWarning(data.warning);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchExisting() {
    try {
      const res = await apiFetch(`/api/discovery/${recallId}`, session);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setResults(data);
          setHasSearched(true);
        }
      }
    } catch {
      // Silent — just means no prior results
    }
  }

  // Load existing results on first render
  useState(() => {
    handleFetchExisting();
  });

  function openReviewDialog(result, action) {
    setReviewTarget(result);
    setReviewAction(action);
    setReviewNotes('');
  }

  async function handleSubmitReview() {
    if (!reviewTarget || !reviewAction) return;
    setReviewSaving(true);
    try {
      const res = await apiFetch(`/api/discovery/${reviewTarget.discovery_id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({
          review_status: reviewAction,
          reviewer_notes: reviewNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const updated = await res.json();
      setResults((prev) =>
        prev.map((r) => (r.discovery_id === updated.discovery_id ? updated : r)),
      );
      setReviewTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewSaving(false);
    }
  }

  async function handleCreateListingAndViolation(result) {
    // Create a listing from the discovery result, then open violation modal
    try {
      const res = await apiFetch('/api/listings', session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: recallId,
          url: result.listing_url,
          marketplace: result.marketplace,
          title: result.listing_title,
          source: 'Discovery',
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const listing = await res.json();
      if (onCreateViolation) onCreateViolation(listing);
    } catch (err) {
      setError('Failed to create listing: ' + err.message);
    }
  }

  // Apply filters
  const filtered = results.filter((r) => {
    if (tierFilter && r.confidence_tier !== tierFilter) return false;
    if (statusFilter && r.review_status !== statusFilter) return false;
    return true;
  });

  return (
    <Box>
      {/* Search controls */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
          onClick={() => handleDiscover(false)}
          disabled={loading}
          sx={{ bgcolor: '#0D47A1' }}
        >
          {loading ? 'Discovering...' : 'Discover & Verify Listings'}
        </Button>
        {hasSearched && (
          <Tooltip title="Force re-search (bypasses cache)">
            <IconButton onClick={() => handleDiscover(true)} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
        {cachedAt && (
          <Typography variant="caption" color="text.secondary">
            Last searched: {new Date(cachedAt).toLocaleDateString()}
          </Typography>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {warning && <Alert severity="warning" sx={{ mb: 2 }}>{warning}</Alert>}

      {/* Filters */}
      {hasSearched && results.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Confidence
            </Typography>
            <ToggleButtonGroup
              value={tierFilter}
              exclusive
              onChange={(_, v) => setTierFilter(v)}
              size="small"
            >
              <ToggleButton value={null}>All</ToggleButton>
              <ToggleButton value="High">High</ToggleButton>
              <ToggleButton value="Uncertain">Uncertain</ToggleButton>
              <ToggleButton value="No Match">No Match</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Review Status
            </Typography>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={(_, v) => setStatusFilter(v)}
              size="small"
            >
              <ToggleButton value={null}>All</ToggleButton>
              <ToggleButton value="Pending Review">Pending</ToggleButton>
              <ToggleButton value="Confirmed Match">Confirmed</ToggleButton>
              <ToggleButton value="Rejected">Rejected</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}

      {/* Results */}
      {hasSearched && results.length === 0 && !loading && (
        <Alert severity="info">No listings found on any marketplace.</Alert>
      )}

      {filtered.map((r) => (
        <Paper key={r.discovery_id} sx={{ p: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography fontWeight={600} noWrap>
                  {r.listing_title || 'Untitled'}
                </Typography>
                <IconButton
                  size="small"
                  href={r.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {r.marketplace}{r.price ? ` · $${r.price}` : ''}
              </Typography>
              {(r.scraped_manufacturer || r.scraped_model_number) && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {[
                    r.scraped_manufacturer && `Brand: ${r.scraped_manufacturer}`,
                    r.scraped_model_number && `Model: ${r.scraped_model_number}`,
                  ].filter(Boolean).join(' · ')}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ml: 1 }}>
              <Chip
                label={r.confidence_tier}
                color={TIER_COLORS[r.confidence_tier] || 'default'}
                size="small"
              />
              <Chip
                label={r.review_status}
                color={STATUS_COLORS[r.review_status] || 'default'}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
            {r.review_status === 'Pending Review' && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => openReviewDialog(r, 'Confirmed Match')}
                >
                  Confirm Match
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => openReviewDialog(r, 'Rejected')}
                >
                  Reject
                </Button>
              </>
            )}
            {r.review_status === 'Confirmed Match' && (
              <Button
                size="small"
                variant="contained"
                onClick={() => handleCreateListingAndViolation(r)}
              >
                Create Violation
              </Button>
            )}
          </Box>
        </Paper>
      ))}

      {/* Review dialog */}
      <Dialog open={!!reviewTarget} onClose={() => setReviewTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewAction === 'Confirmed Match' ? 'Confirm Match' : 'Reject Result'}
        </DialogTitle>
        <DialogContent>
          {reviewTarget && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, mt: 1, bgcolor: 'grey.50' }}>
              <Typography variant="body2" fontWeight={600}>
                {reviewTarget.listing_title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {reviewTarget.marketplace} · Confidence: {reviewTarget.confidence_tier}
              </Typography>
            </Paper>
          )}
          <TextField
            label="Notes (optional)"
            multiline
            minRows={2}
            fullWidth
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewTarget(null)} disabled={reviewSaving}>Cancel</Button>
          <Button
            variant="contained"
            color={reviewAction === 'Confirmed Match' ? 'success' : 'error'}
            onClick={handleSubmitReview}
            disabled={reviewSaving}
          >
            {reviewSaving ? 'Saving...' : reviewAction === 'Confirmed Match' ? 'Confirm' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add client/src/components/DiscoveryPanel.jsx
git commit -m "feat: add DiscoveryPanel component for listing discovery UI"
```

---

### Task 8: Frontend — Integrate into RecallDetailPage

**Files:**
- Modify: `client/src/pages/RecallDetailPage.jsx`

- [x] **Step 1: Add the DiscoveryPanel import**

Add this import at the top of `RecallDetailPage.jsx`, after the existing component imports:

```javascript
import DiscoveryPanel from '../components/DiscoveryPanel';
```

- [x] **Step 2: Add a Discovery tab**

Change the Tabs section (around line 244) to add a 4th tab:

Replace:
```jsx
<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
  <Tab label="Details" />
  <Tab label={`Listings (${listings.length})`} />
  <Tab label={`Violations (${violations.length})`} />
</Tabs>
```

With:
```jsx
<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
  <Tab label="Details" />
  <Tab label="Discovery" />
  <Tab label={`Listings (${listings.length})`} />
  <Tab label={`Violations (${violations.length})`} />
</Tabs>
```

- [x] **Step 3: Add the Discovery tab panel**

Insert a new tab panel block after the Details tab (`{tab === 0 && ...}`) and before the Listings tab. Since a new tab was inserted at index 1, update the existing tab indices:

- Details: `tab === 0` (unchanged)
- Discovery (new): `tab === 1`
- Listings: change `tab === 1` to `tab === 2`
- Violations: change `tab === 2` to `tab === 3`

Add the Discovery panel between Details and Listings:

```jsx
{/* Discovery tab */}
{tab === 1 && (
  <Box>
    <DiscoveryPanel
      recallId={recall.recall_id}
      onCreateViolation={openViolationModal}
    />
  </Box>
)}
```

- [x] **Step 4: Update the Listings tab index**

Change `{tab === 1 && (` to `{tab === 2 && (` for the Listings tab section.

- [x] **Step 5: Update the Violations tab index**

Change `{tab === 2 && (` to `{tab === 3 && (` for the Violations tab section.

- [x] **Step 6: Verify the app builds**

```bash
cd client && npm run build
```

Expected: Build completes with no errors.

- [x] **Step 7: Commit**

```bash
git add client/src/pages/RecallDetailPage.jsx
git commit -m "feat: integrate DiscoveryPanel into RecallDetailPage as new tab"
```

---

## Self-Review Checklist

- **Spec coverage:** All spec sections are covered — pipeline flow (Task 6 route), data model (Task 1 migration), scoring (Task 3), API endpoints (Task 6), frontend UI (Tasks 7-8), error handling (Task 6 route + Task 7 component), caching (Task 5 + Task 6).
- **Placeholder scan:** No TBDs, TODOs, or vague steps. All code is complete.
- **Type consistency:** `CONFIDENCE_TIERS` and `REVIEW_STATUSES` constants used consistently in shared, backend, and frontend. Function names (`scoreMatch`, `scrapeAndExtract`, `dbFetchDiscoveryResults`, etc.) are consistent across import/usage sites.
