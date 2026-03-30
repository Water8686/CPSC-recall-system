-- Fix: app_users.user_type check (e.g. app_user_user_type_check) may not allow ADMIN.
-- Run this in the SQL Editor, then re-run seed_demo_app_users.sql if needed.

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
