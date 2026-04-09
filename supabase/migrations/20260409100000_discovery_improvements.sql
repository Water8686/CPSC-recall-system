-- 1. Add 'Discovery' to listing_source_enum so listings promoted from
--    Smart Listing Discovery can record their origin correctly.
ALTER TYPE listing_source_enum ADD VALUE IF NOT EXISTS 'Discovery';

-- 2. Unique constraint on discovery_result (recall_id, listing_url) so the
--    server can use a single upsert instead of N+1 SELECT + INSERT/UPDATE calls.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_discovery_recall_url'
  ) THEN
    ALTER TABLE discovery_result
      ADD CONSTRAINT uq_discovery_recall_url UNIQUE (recall_id, listing_url);
  END IF;
END$$;
