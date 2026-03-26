-- When a Supabase Auth user is created, ensure a matching row exists in public."user"
-- so the API can resolve JWT email -> user_id for prioritization (see server dbResolveAppUserId).
--
-- public."user".user_type is constrained by app_user_user_type_check to exactly:
--   MANAGER | INVESTIGATOR | RETAILER (uppercase). Profiles use admin/manager/investigator/seller.
-- map_profiles_user_type_to_app_user_type() bridges the two models.

create or replace function public.map_profiles_user_type_to_app_user_type(p_profile_type text)
returns character varying(50)
language sql
immutable
set search_path = public
as $$
  select (
    case lower(btrim(coalesce(p_profile_type, '')))
      when 'admin' then 'MANAGER'
      when 'administrator' then 'MANAGER'
      when 'manager' then 'MANAGER'
      when 'cpsc manager' then 'MANAGER'
      when 'cpsc_manager' then 'MANAGER'
      when 'investigator' then 'INVESTIGATOR'
      when 'seller' then 'RETAILER'
      else 'INVESTIGATOR'
    end
  )::character varying(50);
$$;

create or replace function public.handle_new_auth_app_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  -- Not used for authentication (Supabase handles auth). Satisfies legacy NOT NULL password.
  v_password_placeholder text := '__SUPABASE_AUTH__';
begin
  v_email := btrim(coalesce(new.email, ''));
  if length(v_email) = 0 then
    return new;
  end if;

  if not exists (select 1 from public."user" u where u.username = v_email) then
    insert into public."user" (username, password, user_type)
    values (
      v_email,
      v_password_placeholder,
      public.map_profiles_user_type_to_app_user_type(
        (select p.user_type from public.profiles p where p.id = new.id)
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_app_user on auth.users;

create trigger on_auth_user_created_app_user
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_app_user();

-- Backfill for accounts created before this migration
insert into public."user" (username, password, user_type)
select
  btrim(u.email),
  '__SUPABASE_AUTH__'::text,
  public.map_profiles_user_type_to_app_user_type(p.user_type)
from auth.users u
left join public.profiles p on p.id = u.id
where u.email is not null
  and length(btrim(u.email)) > 0
  and not exists (
    select 1 from public."user" x where x.username = btrim(u.email)
  );
