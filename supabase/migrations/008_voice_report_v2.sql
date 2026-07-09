alter table public.work_logs
  add column if not exists trade text,
  add column if not exists work_start_at timestamptz,
  add column if not exists work_end_at timestamptz;

create table if not exists public.roster (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists roster_user_active_idx on public.roster(user_id, active);

alter table public.roster enable row level security;

create policy "roster owner read" on public.roster for select using (user_id = auth.uid());
create policy "roster owner insert" on public.roster for insert with check (user_id = auth.uid());
create policy "roster owner update" on public.roster for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "roster owner delete" on public.roster for delete using (user_id = auth.uid());

-- Rollback SQL, if this migration must be reverted:
-- drop policy if exists "roster owner delete" on public.roster;
-- drop policy if exists "roster owner update" on public.roster;
-- drop policy if exists "roster owner insert" on public.roster;
-- drop policy if exists "roster owner read" on public.roster;
-- drop table if exists public.roster;
-- alter table public.work_logs drop column if exists work_end_at;
-- alter table public.work_logs drop column if exists work_start_at;
-- alter table public.work_logs drop column if exists trade;
