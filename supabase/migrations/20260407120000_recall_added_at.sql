-- Add "added to system" timestamp to recall table
ALTER TABLE recall ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing rows with recall_date as a reasonable proxy
UPDATE recall SET added_at = COALESCE(recall_date, now()) WHERE added_at = now();
