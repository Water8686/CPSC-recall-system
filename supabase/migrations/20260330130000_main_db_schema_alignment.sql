-- Main Supabase database alignment for app-managed auth (no Supabase Auth).
-- Run via Supabase SQL Editor or `supabase db push` after review.
--
-- 1) Extends app_users.user_type check to include admin (lowercase comparison).
-- 2) Recreates password_reset_tokens with BIGINT user_id → app_users(user_id).

-- Drop every user_type check (names vary: app_user_user_type_check, app_users_*, etc.)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.app_users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%user_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_user_type_check
  CHECK (
    lower(trim(user_type::text)) IN (
      'admin',
      'manager',
      'investigator',
      'retailer',
      'seller'
    )
  );

DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;

CREATE TABLE public.password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.app_users (user_id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX password_reset_tokens_user_idx ON public.password_reset_tokens (user_id);
CREATE INDEX password_reset_tokens_expires_idx ON public.password_reset_tokens (expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.password_reset_tokens TO postgres, service_role;
GRANT ALL ON SEQUENCE public.password_reset_tokens_id_seq TO postgres, service_role;
