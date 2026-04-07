-- Audit: listing-to-recall alignment
-- Run this against your Supabase database to review listing/recall associations.
-- Look for listings whose title doesn't match the recall they're linked to.

-- 1. All listings with their linked recall info
SELECT
  l.listing_id,
  l.listing_title   AS listing_title,
  l.listing_url,
  l.recall_id        AS listing_recall_id,
  r.recall_number,
  r.product_name     AS recall_product,
  m.marketplace_name AS marketplace,
  l.source
FROM listing l
LEFT JOIN recall r ON r.recall_id = l.recall_id
LEFT JOIN marketplace m ON m.marketplace_id = l.marketplace_id
ORDER BY l.recall_id, l.listing_id;

-- 2. Orphaned listings (no recall linked)
SELECT
  l.listing_id,
  l.listing_title,
  l.listing_url,
  m.marketplace_name AS marketplace
FROM listing l
LEFT JOIN marketplace m ON m.marketplace_id = l.marketplace_id
WHERE l.recall_id IS NULL
ORDER BY l.listing_id;

-- 3. Summary: listing count per recall
SELECT
  r.recall_number,
  r.product_name,
  COUNT(l.listing_id) AS listing_count
FROM recall r
LEFT JOIN listing l ON l.recall_id = r.recall_id
GROUP BY r.recall_id, r.recall_number, r.product_name
HAVING COUNT(l.listing_id) > 0
ORDER BY listing_count DESC;
