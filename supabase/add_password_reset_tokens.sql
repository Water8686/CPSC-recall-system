-- Create the password_reset_tokens table used by /api/auth/forgot-password
-- and /api/auth/reset-password.
--
-- Idempotent: safe to run on an existing database. Matches the column shape
-- expected by server/src/routes/auth.js (bigint user_id referencing app_users).
--
-- How to apply: Supabase Dashboard → SQL Editor → paste and run.

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  token       TEXT        PRIMARY KEY,
  user_id     BIGINT      NOT NULL REFERENCES public.app_users (user_id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON public.password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
  ON public.password_reset_tokens (expires_at);
