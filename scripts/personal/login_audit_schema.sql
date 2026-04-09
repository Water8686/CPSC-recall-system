-- Personal / optional audit database only.
-- Run in a dedicated Supabase project (or SQL editor), not the team's shared app DB.
-- Server env: AUDIT_SUPABASE_URL, AUDIT_SUPABASE_SERVICE_ROLE_KEY
-- Optional: LOGIN_AUDIT_SALT (server secret for fingerprint_hash HMAC)

create extension if not exists "pgcrypto";

create table if not exists public.login_audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  outcome text not null,
  app_user_id bigint,
  email_normalized text,
  role text,
  ip text,
  forwarded_for text,
  user_agent text,
  accept_language text,
  sec_ch_ua text,
  sec_ch_ua_platform text,
  sec_ch_ua_mobile text,
  origin text,
  referer text,
  fingerprint_hash text
);

create index if not exists login_audit_events_occurred_at_idx on public.login_audit_events (occurred_at desc);
create index if not exists login_audit_events_app_user_id_idx on public.login_audit_events (app_user_id);
create index if not exists login_audit_events_outcome_idx on public.login_audit_events (outcome);

create table if not exists public.login_audit_sessions (
  session_id uuid primary key,
  app_user_id bigint not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  login_event_id uuid references public.login_audit_events (id) on delete set null
);

create index if not exists login_audit_sessions_user_started_idx
  on public.login_audit_sessions (app_user_id, started_at desc);

create index if not exists login_audit_sessions_open_idx
  on public.login_audit_sessions (app_user_id)
  where ended_at is null;

-- Deny direct client access; service role bypasses RLS.
alter table public.login_audit_events enable row level security;
alter table public.login_audit_sessions enable row level security;
