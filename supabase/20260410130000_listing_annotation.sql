-- Listing match annotation (CPSC workflow: true/false positive + commentary).
-- Apply in Supabase SQL Editor if you do not use CLI migrate. Safe to re-run.

ALTER TABLE public.listing
  ADD COLUMN IF NOT EXISTS is_true_match boolean,
  ADD COLUMN IF NOT EXISTS annotation_notes text,
  ADD COLUMN IF NOT EXISTS annotated_by bigint,
  ADD COLUMN IF NOT EXISTS annotated_at timestamptz;

COMMENT ON COLUMN public.listing.is_true_match IS 'Investigator: true if listing matches recall, false if ruled out';
COMMENT ON COLUMN public.listing.annotated_by IS 'app_users.user_id of annotator, when set';
