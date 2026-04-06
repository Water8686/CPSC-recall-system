-- Sprint 2: violation_type, date_of_violation, listing source + recall association

-- 1. Violation type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'violation_type_enum') THEN
    CREATE TYPE violation_type_enum AS ENUM (
      'Recalled Product Listed for Sale',
      'Failure to Notify Consumers',
      'Banned Hazardous Substance',
      'Misbranded or Mislabeled Product',
      'Failure to Report',
      'Counterfeit Safety Certification'
    );
  END IF;
END$$;

-- 2. New columns on violation table
ALTER TABLE violation
  ADD COLUMN IF NOT EXISTS violation_type violation_type_enum
    NOT NULL DEFAULT 'Recalled Product Listed for Sale';

ALTER TABLE violation
  ADD COLUMN IF NOT EXISTS date_of_violation DATE
    NOT NULL DEFAULT CURRENT_DATE;

-- 3. Unique constraint for upsert (one violation per listing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_violation_listing'
  ) THEN
    ALTER TABLE violation
      ADD CONSTRAINT uq_violation_listing UNIQUE (listing_id);
  END IF;
END$$;

-- 4. Listing source tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_source_enum') THEN
    CREATE TYPE listing_source_enum AS ENUM (
      'eBay API',
      'Zyte',
      'Manual'
    );
  END IF;
END$$;

ALTER TABLE listing
  ADD COLUMN IF NOT EXISTS source listing_source_enum
    NOT NULL DEFAULT 'Manual';

-- 5. Listing–recall association
ALTER TABLE listing
  ADD COLUMN IF NOT EXISTS recall_id INTEGER REFERENCES recall(recall_id);
