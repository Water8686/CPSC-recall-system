-- Demo logins: CPSC Manager + Investigator (Supabase)
--
-- Emails (as requested):
--   cpcsmanger@test.com        → manager role
--   cpscinvestigator@test.com  → investigator role
--
-- 1) Dashboard → Authentication → Users → "Add user" (twice).
--    Use the emails above. Simple dev passwords (change in production):
--      cpcsmanger@test.com       →  manager123
--      cpscinvestigator@test.com →  investigator123
--    Enable "Auto Confirm User" for each.
--
-- 2) Run the SQL below in SQL Editor (after both users exist).

-- Manager
update public.profiles p
set user_type = 'manager', updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('cpcsmanger@test.com');

-- Investigator
update public.profiles p
set user_type = 'investigator', updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('cpscinvestigator@test.com');

-- If profiles rows are missing (no trigger on signup), upsert:

insert into public.profiles (id, user_type, username, full_name, updated_at)
select u.id, 'manager', split_part(u.email, '@', 1), 'CPSC Manager', now()
from auth.users u
where lower(u.email) = lower('cpcsmanger@test.com')
on conflict (id) do update
  set user_type = excluded.user_type, updated_at = now();

insert into public.profiles (id, user_type, username, full_name, updated_at)
select u.id, 'investigator', split_part(u.email, '@', 1), 'CPSC Investigator', now()
from auth.users u
where lower(u.email) = lower('cpscinvestigator@test.com')
on conflict (id) do update
  set user_type = excluded.user_type, updated_at = now();
