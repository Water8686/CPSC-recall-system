-- Enforce that every listing must be linked to a recall.
-- PREREQUISITE: Run scripts/audit-listing-recalls.sql and resolve any
-- listings with NULL recall_id before applying this migration.

ALTER TABLE listing ALTER COLUMN recall_id SET NOT NULL;
