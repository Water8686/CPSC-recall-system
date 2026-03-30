-- Demo accounts migrated from legacy app_users (email, password_plain, user_type).
-- Target: public.app_users (bigint user_id, username, password, user_type, email, …).
--
-- If you see: violates check constraint "app_user_user_type_check" (or similar),
-- run fix_app_users_user_type_check.sql first so ADMIN / MANAGER / … are allowed.
--
-- Passwords match the old plain-text demo: demo1234
-- ON CONFLICT updates password/role/approval if you re-run the script.

INSERT INTO public.app_users (
  username,
  email,
  password,
  user_type,
  approved,
  created_at,
  updated_at
)
VALUES
  ('manager@cpsc.demo', 'manager@cpsc.demo', 'demo1234', 'MANAGER', true, now(), now()),
  ('investigator@cpsc.demo', 'investigator@cpsc.demo', 'demo1234', 'INVESTIGATOR', true, now(), now()),
  ('seller@cpsc.demo', 'seller@cpsc.demo', 'demo1234', 'RETAILER', true, now(), now()),
  ('admin@cpsc.demo', 'admin@cpsc.demo', 'demo1234', 'ADMIN', true, now(), now())
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  user_type = EXCLUDED.user_type,
  approved = EXCLUDED.approved,
  updated_at = now();
