-- Sprint 1: profiles linked to auth.users (no recalls/prioritizations here)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'investigator'
    check (role in ('manager', 'investigator', 'seller')),
  display_name text,
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'App user profile; role drives CPSC Manager vs Investigator vs Seller.';

create index profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- New auth users get a profile row (role from signup metadata or investigator)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'role'), ''),
      'investigator'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
