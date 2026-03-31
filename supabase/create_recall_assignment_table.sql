-- Creates recall assignments (single investigator per recall).
-- Mirrors prioritization "upsert latest per recall" semantics but enforces uniqueness.

create table if not exists public.recall_assignment (
  recall_assignment_id bigserial primary key,
  recall_id bigint not null references public.recall(recall_id) on delete cascade,
  investigator_user_id bigint not null references public.app_users(user_id),
  assigned_by_user_id bigint references public.app_users(user_id),
  assigned_at timestamptz not null default now(),
  constraint recall_assignment_one_per_recall unique (recall_id)
);

create index if not exists recall_assignment_investigator_idx
  on public.recall_assignment (investigator_user_id);

