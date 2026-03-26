-- Rubric extensions: profiles approval/avatar, recall detail fields, violation + seller responses.
-- Apply via Supabase SQL Editor or `supabase db push` after linking.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS requested_role text;

ALTER TABLE public.recall
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS remedy text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS public.violation (
  violation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recall_id bigint NOT NULL REFERENCES public.recall (recall_id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  investigator_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  platform text NOT NULL,
  listing_url text NOT NULL,
  status text NOT NULL DEFAULT 'Open',
  severity text NOT NULL DEFAULT 'Medium',
  adjudication_status text,
  adjudication_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violation_seller ON public.violation (seller_id);
CREATE INDEX IF NOT EXISTS idx_violation_investigator ON public.violation (investigator_id);
CREATE INDEX IF NOT EXISTS idx_violation_recall ON public.violation (recall_id);

CREATE TABLE IF NOT EXISTS public.violation_response (
  response_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  violation_id bigint NOT NULL REFERENCES public.violation (violation_id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  response_text text NOT NULL,
  evidence_url text,
  response_type text NOT NULL,
  status text NOT NULL DEFAULT 'Submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violation_response_violation ON public.violation_response (violation_id);

ALTER TABLE public.violation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_response ENABLE ROW LEVEL SECURITY;
