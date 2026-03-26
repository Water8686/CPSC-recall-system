-- Fix: Supabase SQL Editor (and other trusted DB sessions) have auth.uid() = NULL.
-- The previous guard raised "Only admins may change user_type" for NULL uid, which blocked
-- the legitimate first-admin bootstrap UPDATE run from the dashboard.
--
-- Rule now: block user_type changes only when the session is an authenticated end user
-- who is not an admin. Allow when auth.uid() is null (SQL Editor, migrations) or when admin.

create or replace function public.profiles_guard_user_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.user_type is distinct from old.user_type then
    if auth.uid() is not null and not public.is_profile_admin(auth.uid()) then
      raise exception 'Only admins may change user_type' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
