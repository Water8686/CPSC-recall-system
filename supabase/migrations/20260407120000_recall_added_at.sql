-- Add "added to system" timestamp to recall table

-- Step 1: Add column as nullable first (so existing rows get NULL)
ALTER TABLE recall ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ;

-- Step 2: Backfill existing rows with recall_date as a reasonable proxy
UPDATE recall SET added_at = COALESCE(recall_date, now()) WHERE added_at IS NULL;

-- Step 3: Now set NOT NULL and DEFAULT for future inserts
ALTER TABLE recall ALTER COLUMN added_at SET NOT NULL;
ALTER TABLE recall ALTER COLUMN added_at SET DEFAULT now();
