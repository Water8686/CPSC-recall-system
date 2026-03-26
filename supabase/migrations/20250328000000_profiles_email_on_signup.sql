-- New auth users: store sign-in email on profiles so admin UI and tooling can show accounts.
-- (handle_new_user previously only set id + user_type, leaving email/username empty.)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := nullif(btrim(coalesce(new.email, '')), '');

  insert into public.profiles (id, user_type, email)
  values (new.id, 'investigator', v_email);

  return new;
end;
$$;

-- Catch up profiles missing email (idempotent with 20250325220000 backfill)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and u.email is not null
  and btrim(u.email) <> ''
  and (p.email is null or btrim(p.email) = '');
