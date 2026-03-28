-- =============================================================================
-- BENSCPSC / fresh Supabase — full schema + seed (class project)
-- Run once in Supabase → SQL Editor → New query → Paste → Run
-- Destroys existing public tables with these names if present.
-- =============================================================================

-- Optional legacy tables from earlier experiments
DROP TABLE IF EXISTS public.auth_refresh_tokens CASCADE;
DROP TABLE IF EXISTS public.auth_password_resets CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.prioritization CASCADE;
DROP TABLE IF EXISTS public.recall CASCADE;
DROP TABLE IF EXISTS public."user" CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- -----------------------------------------------------------------------------
-- recall (Sprint 1)
-- -----------------------------------------------------------------------------
CREATE TABLE public.recall (
  recall_id BIGSERIAL PRIMARY KEY,
  recall_number TEXT NOT NULL UNIQUE,
  recall_title TEXT,
  product_name TEXT,
  product_type TEXT,
  hazard TEXT,
  recall_date TIMESTAMPTZ,
  last_publish_date TIMESTAMPTZ,
  image_url TEXT
);

-- -----------------------------------------------------------------------------
-- user — links app login UUID to prioritization.user_id (username = email)
-- -----------------------------------------------------------------------------
CREATE TABLE public."user" (
  user_id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- app_users — app-managed auth (no Supabase Auth)
-- -----------------------------------------------------------------------------
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  password_plain TEXT,
  user_type TEXT NOT NULL DEFAULT 'seller',
  approved BOOLEAN NOT NULL DEFAULT false,
  full_name TEXT,
  avatar_url TEXT,
  requested_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_users_user_type_chk CHECK (
    lower(trim(user_type)) IN (
      'admin',
      'administrator',
      'manager',
      'cpsc manager',
      'cpsc_manager',
      'investigator',
      'seller'
    )
  )
);

CREATE INDEX app_users_email_idx ON public.app_users (lower(email));

-- -----------------------------------------------------------------------------
-- prioritization (Sprint 1)
-- -----------------------------------------------------------------------------
CREATE TABLE public.prioritization (
  prioritization_id BIGSERIAL PRIMARY KEY,
  recall_id BIGINT NOT NULL REFERENCES public.recall (recall_id) ON DELETE CASCADE,
  priority_rank SMALLINT NOT NULL CHECK (priority_rank IN (1, 2, 3)),
  prioritized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_start_at TIMESTAMPTZ,
  user_id UUID NOT NULL REFERENCES public."user" (user_id) ON DELETE RESTRICT
);

CREATE INDEX prioritization_recall_id_idx ON public.prioritization (recall_id);

-- -----------------------------------------------------------------------------
-- RLS — API uses service_role (bypasses RLS). Lock direct anon access.
-- -----------------------------------------------------------------------------
ALTER TABLE public.recall ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prioritization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Grants (Supabase roles)
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- Seed: demo users (fixed UUIDs — use with CREDENTIALS.md)
-- Password for all demo accounts: demo1234 (plaintext, class demo only)
-- =============================================================================
INSERT INTO public."user" (user_id, username) VALUES
  ('00000001-0001-4001-8001-000000000001'::uuid, 'manager@cpsc.demo'),
  ('00000001-0001-4001-8001-000000000002'::uuid, 'investigator@cpsc.demo'),
  ('00000001-0001-4001-8001-000000000003'::uuid, 'seller@cpsc.demo'),
  ('00000001-0001-4001-8001-000000000004'::uuid, 'admin@cpsc.demo');

INSERT INTO public.app_users (
  id,
  email,
  password_plain,
  password_hash,
  user_type,
  approved,
  full_name
) VALUES
  (
    '00000001-0001-4001-8001-000000000001'::uuid,
    'manager@cpsc.demo',
    'demo1234',
    NULL,
    'manager',
    true,
    'Demo CPSC Manager'
  ),
  (
    '00000001-0001-4001-8001-000000000002'::uuid,
    'investigator@cpsc.demo',
    'demo1234',
    NULL,
    'investigator',
    true,
    'Demo Investigator'
  ),
  (
    '00000001-0001-4001-8001-000000000003'::uuid,
    'seller@cpsc.demo',
    'demo1234',
    NULL,
    'seller',
    true,
    'Demo Seller'
  ),
  (
    '00000001-0001-4001-8001-000000000004'::uuid,
    'admin@cpsc.demo',
    'demo1234',
    NULL,
    'admin',
    true,
    'Demo Admin'
  );

-- =============================================================================
-- Seed: recalls (aligned with server mockData.js)
-- =============================================================================
INSERT INTO public.recall (recall_number, recall_title, product_name, product_type, hazard, recall_date, last_publish_date) VALUES
  ('24-001', 'Infant Crib Recall', 'Baby Cribs', 'Baby Cribs', 'Fall', '2024-01-15T10:00:00Z'::timestamptz, NULL),
  ('24-002', 'Children''s Toy Choking Hazard', 'Plastic Toys', 'Plastic Toys', 'Choking', '2024-01-18T14:30:00Z'::timestamptz, NULL),
  ('24-003', 'Hair Dryer Fire Risk', 'Hair Dryers', 'Hair Dryers', 'Fire', '2024-01-22T09:15:00Z'::timestamptz, NULL),
  ('24-004', 'Power Strip Overheating', 'Power Strips', 'Power Strips', 'Fire', '2024-01-25T11:00:00Z'::timestamptz, NULL),
  ('24-005', 'Blinds Strangulation Risk', 'Window Blinds', 'Window Blinds', 'Strangulation', '2024-02-01T08:45:00Z'::timestamptz, NULL),
  ('24-006', 'High Chair Tip-Over', 'High Chairs', 'High Chairs', 'Fall', '2024-02-05T13:20:00Z'::timestamptz, NULL),
  ('24-007', 'Battery Pack Explosion', 'Portable Chargers', 'Portable Chargers', 'Fire', '2024-02-10T16:00:00Z'::timestamptz, NULL),
  ('24-008', 'Lead Paint in Children''s Furniture', 'Kids Furniture', 'Kids Furniture', 'Lead', '2024-02-14T10:30:00Z'::timestamptz, NULL),
  ('24-009', 'Space Heater Burn Hazard', 'Space Heaters', 'Space Heaters', 'Burn', '2024-02-18T09:00:00Z'::timestamptz, NULL),
  ('24-010', 'Drawstring Hoodie Strangulation', 'Children''s Clothing', 'Children''s Clothing', 'Strangulation', '2024-02-22T14:00:00Z'::timestamptz, NULL),
  ('24-011', 'Coffee Maker Scalding', 'Coffee Makers', 'Coffee Makers', 'Burn', '2024-02-26T11:45:00Z'::timestamptz, NULL),
  ('24-012', 'Bunk Bed Collapse', 'Bunk Beds', 'Bunk Beds', 'Fall', '2024-03-01T08:00:00Z'::timestamptz, NULL),
  ('24-013', 'Magnetic Toy Ingestion', 'Magnetic Toys', 'Magnetic Toys', 'Ingestion', '2024-03-05T12:30:00Z'::timestamptz, NULL),
  ('24-014', 'Extension Cord Overload', 'Extension Cords', 'Extension Cords', 'Fire', '2024-03-08T15:00:00Z'::timestamptz, NULL),
  ('24-015', 'Stroller Wheel Detachment', 'Strollers', 'Strollers', 'Fall', '2024-03-12T10:15:00Z'::timestamptz, NULL),
  ('24-016', 'Candle Fire Hazard', 'Scented Candles', 'Scented Candles', 'Fire', '2024-03-15T09:30:00Z'::timestamptz, NULL),
  ('24-017', 'Playpen Side Collapse', 'Playpens', 'Playpens', 'Entrapment', '2024-03-18T13:45:00Z'::timestamptz, NULL),
  ('24-018', 'Electric Blanket Overheating', 'Electric Blankets', 'Electric Blankets', 'Fire', '2024-03-22T11:00:00Z'::timestamptz, NULL),
  ('24-019', 'Scooter Brake Failure', 'Kick Scooters', 'Kick Scooters', 'Fall', '2024-03-25T14:20:00Z'::timestamptz, NULL),
  ('24-020', 'Dresser Tip-Over', 'Dressers', 'Dressers', 'Tip-Over', '2024-03-28T08:30:00Z'::timestamptz, NULL),
  ('24-021', 'Baby Monitor Cord Strangulation', 'Baby Monitors', 'Baby Monitors', 'Strangulation', '2024-04-01T10:00:00Z'::timestamptz, NULL),
  ('24-022', 'Trampoline Net Tear', 'Trampolines', 'Trampolines', 'Fall', '2024-04-05T12:00:00Z'::timestamptz, NULL),
  ('24-023', 'Lamp Electrical Shock', 'Table Lamps', 'Table Lamps', 'Shock', '2024-04-08T15:30:00Z'::timestamptz, NULL),
  ('24-024', 'Bike Helmet Impact Failure', 'Bicycle Helmets', 'Bicycle Helmets', 'Head Injury', '2024-04-12T09:15:00Z'::timestamptz, NULL),
  ('24-025', 'Pet Crate Latch Failure', 'Pet Crates', 'Pet Crates', 'Entrapment', '2024-04-15T11:45:00Z'::timestamptz, NULL);

-- Sample product-style images (placeholder URLs; optional for demos)
UPDATE public.recall SET image_url = 'https://picsum.photos/seed/cpsc24001/96/96' WHERE recall_number = '24-001';
UPDATE public.recall SET image_url = 'https://picsum.photos/seed/cpsc24002/96/96' WHERE recall_number = '24-002';
UPDATE public.recall SET image_url = 'https://picsum.photos/seed/cpsc24003/96/96' WHERE recall_number = '24-003';

-- =============================================================================
-- Seed: prioritizations (manager user_id; matches mockData.js)
-- =============================================================================
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 1, '2024-04-01T10:00:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-001';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 1, '2024-04-01T10:05:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-002';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 2, '2024-04-01T10:10:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-003';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 2, '2024-04-01T10:15:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-004';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 1, '2024-04-01T10:20:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-005';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 3, '2024-04-01T10:25:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-006';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 1, '2024-04-01T10:30:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-007';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 1, '2024-04-01T10:35:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-008';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 2, '2024-04-01T10:40:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-009';
INSERT INTO public.prioritization (recall_id, priority_rank, prioritized_at, user_id) SELECT recall_id, 1, '2024-04-01T10:45:00Z'::timestamptz, '00000001-0001-4001-8001-000000000001'::uuid FROM public.recall WHERE recall_number = '24-010';

-- =============================================================================
-- Password reset tokens (forgot-password / reset-password API)
-- =============================================================================
CREATE TABLE public.password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_tokens_user_idx ON public.password_reset_tokens (user_id);
CREATE INDEX password_reset_tokens_expires_idx ON public.password_reset_tokens (expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.password_reset_tokens TO postgres, service_role;
GRANT ALL ON SEQUENCE public.password_reset_tokens_id_seq TO postgres, service_role;
