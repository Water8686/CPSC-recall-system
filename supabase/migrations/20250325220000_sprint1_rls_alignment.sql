-- Sprint 1 alignment: RLS for recall / prioritization / profiles + public.user self-lookup.
-- Run against your CSPC Supabase project (Dashboard → SQL or supabase db push).
-- Prerequisite: profiles.id = auth.users.id (Supabase Auth). profiles.user_type holds admin|manager|investigator|seller.

-- Directory column for admin UI (no service_role in the browser)
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

create or replace function public.is_profile_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and lower(trim(p.user_type)) in ('admin', 'administrator')
  );
$$;

grant execute on function public.is_profile_admin(uuid) to authenticated;

create or replace function public.is_cpsc_manager_or_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and lower(trim(p.user_type)) in (
        'admin', 'administrator', 'manager', 'cpsc manager', 'cpsc_manager'
      )
  );
$$;

grant execute on function public.is_cpsc_manager_or_admin(uuid) to authenticated;

create or replace function public.profiles_guard_user_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.user_type is distinct from old.user_type then
    -- Allow when auth.uid() is null (SQL Editor / trusted session). Block non-admins with JWT.
    if auth.uid() is not null and not public.is_profile_admin(auth.uid()) then
      raise exception 'Only admins may change user_type' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_user_type_trg on public.profiles;
create trigger profiles_guard_user_type_trg
  before update on public.profiles
  for each row execute function public.profiles_guard_user_type();

-- One row per user: self read + admin read all
drop policy if exists "profiles_select_self_or_admin_v1" on public.profiles;
create policy "profiles_select_self_or_admin_v1"
  on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_profile_admin(auth.uid()));

drop policy if exists "profiles_update_self_or_admin_v1" on public.profiles;
create policy "profiles_update_self_or_admin_v1"
  on public.profiles for update to authenticated
  using (auth.uid() = id or public.is_profile_admin(auth.uid()))
  with check (auth.uid() = id or public.is_profile_admin(auth.uid()));

alter table public.recall enable row level security;

drop policy if exists "recall_read_authenticated_v1" on public.recall;
create policy "recall_read_authenticated_v1"
  on public.recall for select to authenticated
  using (true);

alter table public.prioritization enable row level security;

drop policy if exists "prioritization_read_authenticated_v1" on public.prioritization;
create policy "prioritization_read_authenticated_v1"
  on public.prioritization for select to authenticated
  using (true);

drop policy if exists "prioritization_insert_manager_v1" on public.prioritization;
create policy "prioritization_insert_manager_v1"
  on public.prioritization for insert to authenticated
  with check (public.is_cpsc_manager_or_admin(auth.uid()));

drop policy if exists "prioritization_update_manager_v1" on public.prioritization;
create policy "prioritization_update_manager_v1"
  on public.prioritization for update to authenticated
  using (public.is_cpsc_manager_or_admin(auth.uid()))
  with check (public.is_cpsc_manager_or_admin(auth.uid()));

-- Map JWT email → public.user.user_id for prioritization inserts
alter table public."user" enable row level security;

drop policy if exists "app_user_read_self_v1" on public."user";
create policy "app_user_read_self_v1"
  on public."user" for select to authenticated
  using (username = (auth.jwt() ->> 'email'));
