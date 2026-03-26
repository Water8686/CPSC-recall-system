-- Add admin role; new signups always get investigator (roles assigned by admin or bootstrap).

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'manager', 'investigator', 'seller'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'investigator');
  return new;
end;
$$;
