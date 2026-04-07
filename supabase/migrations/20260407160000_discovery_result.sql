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
