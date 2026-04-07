# Smart Listing Discovery with Verification

**Date:** 2026-04-07
**Status:** Approved

## Overview

Add an automated listing discovery pipeline that combines SerpAPI (marketplace search) with Firecrawl (page scraping + product verification) to help investigators find and verify marketplace listings that match recalled products. Investigators trigger a search from the recall detail page, review results with confidence scores, and can confirm/reject matches before filing violations.

## Decisions

- **Discovery:** SerpAPI (Google Shopping) — already integrated, structured product data, free tier (100 searches/month)
- **Enrichment & Verification:** Firecrawl — scrapes listing pages and extracts product details via LLM extraction (20,000 credits available)
- **Trigger:** On-demand per recall — investigator clicks "Search for Listings" on recall detail page
- **Verification fields:** Product name (weight 20), manufacturer (weight 30), model number (weight 50)
- **Confidence display:** Three tiers (High / Uncertain / No Match) with weighted scoring under the hood
- **Investigator override:** Investigators can confirm or reject any result regardless of system confidence
- **Result persistence:** All results saved with review status (Pending Review / Confirmed Match / Rejected)
- **Marketplace scope:** Search all supported marketplaces automatically, no picker
- **Architecture:** Sequential pipeline (SerpAPI → Firecrawl → scoring → save → return)
- **Budget:** Free SerpAPI tier, 20,000 Firecrawl credits (student project)

## Pipeline Architecture

### Flow

1. Investigator clicks "Search for Listings" on a recall detail page
2. Frontend sends `POST /api/listing-search/discover` with the recall ID
3. Server fetches recall data (product name, manufacturer, model number)
4. Server checks cache — if this recall was searched within the last 7 days, return cached results (unless `?force=true`)
5. Server builds a search query and calls SerpAPI (Google Shopping)
6. For each candidate URL returned, server calls Firecrawl to scrape the full page
7. Server runs verification logic — compares scraped fields against recall data using weighted fuzzy matching
8. Each result gets a confidence tier: High, Uncertain, or No Match
9. All results are saved to the `discovery_result` table with status `Pending Review`
10. Full result set is returned to the frontend

### Caching

Before calling SerpAPI, check if this recall was already searched within the last 7 days. If cached results exist, return them instead of burning an API call. Investigator can force a fresh search with a "Re-search" button that sends `?force=true`.

## Data Model

### New table: `discovery_result`

| Column | Type | Description |
|---|---|---|
| `discovery_id` | UUID (PK, default gen_random_uuid()) | Unique result ID |
| `recall_id` | BIGINT (FK → recall) | Links to the recall being investigated |
| `user_id` | UUID (FK → app_users) | Investigator who ran the search |
| `listing_url` | TEXT NOT NULL | URL of the discovered listing |
| `listing_title` | TEXT | Title from the marketplace |
| `marketplace` | TEXT | Detected marketplace (Amazon, eBay, Walmart, etc.) |
| `price` | TEXT | Listed price (if available) |
| `scraped_product_name` | TEXT | Product name extracted by Firecrawl |
| `scraped_manufacturer` | TEXT | Manufacturer extracted by Firecrawl |
| `scraped_model_number` | TEXT | Model number extracted by Firecrawl |
| `confidence_tier` | TEXT CHECK (High, Uncertain, No Match) | Display tier for investigators |
| `confidence_score` | NUMERIC | Raw weighted score 0-100 (internal) |
| `review_status` | TEXT CHECK (Pending Review, Confirmed Match, Rejected) | Investigator's decision |
| `reviewer_notes` | TEXT | Optional investigator notes |
| `searched_at` | TIMESTAMPTZ DEFAULT now() | When the search was run (cache key) |
| `reviewed_at` | TIMESTAMPTZ | When the investigator made their decision |

### No other table changes

When an investigator confirms a match and wants to file a violation, the system first creates a `listing` record from the discovery result data (URL, title, marketplace), then opens the existing "Create Violation" modal pre-linked to that listing. This keeps the violation workflow unchanged — violations always reference a `listing_id`.

## Verification & Scoring Logic

### Weighted field matching

Each field is compared using fuzzy string comparison (Levenshtein distance or similar library):

| Field | Weight | Rationale |
|---|---|---|
| Model number | 50 | Most unique identifier — strong signal |
| Manufacturer | 30 | Narrows to the right company |
| Product name | 20 | Least specific — many similar names across brands |

### Scoring rules

- Each field comparison produces a similarity score (0.0 to 1.0)
- Field score = similarity × weight
- Total score = sum of all field scores (0-100)
- If a field is missing from the recall data or the scraped page, it is excluded and weights are redistributed proportionally among remaining fields

### Tier thresholds

- **High Confidence** (score >= 60): At least 2 strong field matches
- **Uncertain** (score 25-59): Partial matches worth reviewing
- **No Match** (score < 25): Likely unrelated product

### Firecrawl extraction

The server sends each candidate URL to Firecrawl's LLM extraction mode with a schema requesting: product name, manufacturer/brand, and model number. Firecrawl handles different page layouts across marketplaces without needing marketplace-specific scrapers.

## API Endpoints

### New route file: `server/src/routes/listingDiscovery.js`

#### POST `/api/listing-search/discover`

- **Auth:** `requireInvestigatorOrAdmin`
- **Body:** `{ recall_id }`
- **Query:** `?force=true` bypasses 7-day cache
- **Behavior:** Checks cache → runs SerpAPI → Firecrawl each URL → scores → saves to `discovery_result` → returns results
- **Returns:** Array of discovery result objects with confidence tiers

#### GET `/api/listing-search/discover/:recall_id`

- **Auth:** `requireInvestigatorOrAdmin`
- **Returns:** All discovery results for the given recall
- **Query filters:** `?review_status=Pending Review&confidence_tier=High`

#### PATCH `/api/listing-search/discover/:discovery_id`

- **Auth:** `requireInvestigatorOrAdmin`
- **Body:** `{ review_status, reviewer_notes }`
- **Behavior:** Updates investigator's decision, sets `reviewed_at` timestamp

### New lib file: `server/src/lib/firecrawlApi.js`

- `scrapeAndExtract(url)` — calls Firecrawl's extract endpoint, returns `{ product_name, manufacturer, model_number }`
- `scoreMatch(scraped, recall)` — runs weighted fuzzy comparison, returns `{ score, tier }`

## Frontend UI

### Location

Integrated into the existing Recall Detail Page (`client/src/pages/RecallDetailPage.jsx`).

### Search trigger

"Search for Listings" button in the recall detail header area, next to existing actions.

### Results panel

Appears below the recall info after a search is triggered:

- **Loading state:** Progress indicator with text ("Searching marketplaces..." → "Verifying products...")
- **Result cards/rows** each showing:
  - Listing title (linked to external URL)
  - Marketplace name
  - Price
  - Confidence tier as color-coded chip: Green (High), Yellow (Uncertain), Red (No Match)
  - Review status chip: Gray (Pending Review), Green (Confirmed), Red (Rejected)
  - "View Page" external link button

### Investigator actions per result

- "Confirm Match" button → sets `review_status = Confirmed Match`
- "Reject" button → sets `review_status = Rejected`
- Optional notes field on confirm/reject
- "Create Violation" button (only on confirmed matches) → creates a `listing` record from the discovery data, then opens the existing violation modal linked to that listing

### Filters

Filter bar at top of results: filter by confidence tier, filter by review status.

### Cache indicator

If cached results exist, show "Last searched: [date]" with cached results and a "Re-search" button to force a fresh search.

## Error Handling & Edge Cases

- **No results from SerpAPI:** Show "No listings found on any marketplace." Save the search timestamp so cache prevents immediate re-searches.
- **Firecrawl fails on a URL:** Skip that result, log the error, continue with remaining URLs. Show note: "2 of 15 listings could not be verified."
- **Recall missing verification fields:** Redistribute weights to remaining fields. Show warning: "Limited verification — recall is missing [field]. Results may be less accurate."
- **Duplicate URLs:** If a candidate URL already exists in `discovery_result` for this recall (from a prior search), update it rather than creating a duplicate.
- **Rate limiting:** If SerpAPI or Firecrawl returns a rate limit error, surface to investigator: "Search limit reached. Try again later."
- **Long-running searches:** Sequential pipeline may take 15-30 seconds. Frontend shows loading state with progress text. Server timeout: 60 seconds max.
