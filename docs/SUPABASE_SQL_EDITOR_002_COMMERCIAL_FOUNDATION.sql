-- Supabase SQL Editor paste script
-- 目的: 商用化前の土台整理をSupabaseに反映する。
-- 前提: supabase/migrations/001_initial_schema.sql が適用済みであること。
-- 注意: URL/Anon Keyなどの秘密情報はここに貼らない。

alter table public.users
  add column if not exists subscription_status text not null default 'trialing' check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'suspended')),
  add column if not exists trial_ends_at timestamptz default (now() + interval '14 days'),
  add column if not exists current_period_ends_at timestamptz,
  add column if not exists billing_customer_id text,
  add column if not exists billing_subscription_id text;

alter table public.profiles
  add column if not exists postal_code text,
  add column if not exists fax text,
  add column if not exists contact_name text;

alter table public.sites add column if not exists app_id text;
update public.sites set app_id = id::text where app_id is null;
alter table public.sites alter column app_id set not null;
create unique index if not exists sites_app_id_key on public.sites(app_id);

alter table public.receipts
  add column if not exists app_id text,
  add column if not exists site_app_id text,
  add column if not exists image_path text,
  add column if not exists image_mime_type text,
  add column if not exists image_size bigint;
update public.receipts set app_id = id::text where app_id is null;
update public.receipts r
  set site_app_id = s.app_id
  from public.sites s
  where r.site_id = s.id and r.site_app_id is null;
alter table public.receipts alter column app_id set not null;
create unique index if not exists receipts_app_id_key on public.receipts(app_id);

alter table public.qualifications add column if not exists app_id text;
update public.qualifications set app_id = id::text where app_id is null;
alter table public.qualifications alter column app_id set not null;
create unique index if not exists qualifications_app_id_key on public.qualifications(app_id);

alter table public.vehicles add column if not exists app_id text;
update public.vehicles set app_id = id::text where app_id is null;
alter table public.vehicles alter column app_id set not null;
create unique index if not exists vehicles_app_id_key on public.vehicles(app_id);

alter table public.invoices
  add column if not exists app_id text,
  add column if not exists site_app_id text,
  add column if not exists invoice_number text,
  add column if not exists issue_date date,
  add column if not exists subject text,
  add column if not exists payment_terms text,
  add column if not exists due_date date,
  add column if not exists notes text;
update public.invoices set app_id = id::text where app_id is null;
update public.invoices i
  set site_app_id = s.app_id
  from public.sites s
  where i.site_id = s.id and i.site_app_id is null;
alter table public.invoices alter column app_id set not null;
create unique index if not exists invoices_app_id_key on public.invoices(app_id);

alter table public.estimates
  add column if not exists app_id text,
  add column if not exists site_app_id text,
  add column if not exists estimate_number text,
  add column if not exists issue_date date,
  add column if not exists subject text,
  add column if not exists construction_period text,
  add column if not exists work_place text,
  add column if not exists payment_terms text,
  add column if not exists notes text;
update public.estimates set app_id = id::text where app_id is null;
update public.estimates e
  set site_app_id = s.app_id
  from public.sites s
  where e.site_id = s.id and e.site_app_id is null;
alter table public.estimates alter column app_id set not null;
create unique index if not exists estimates_app_id_key on public.estimates(app_id);

create table if not exists public.work_logs (
  id uuid primary key default gen_random_uuid(),
  app_id text not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  site_app_id text,
  site_name text,
  workers text,
  memo text,
  photo_urls text[] not null default '{}',
  receipt_done boolean not null default false,
  photo_done boolean not null default false,
  invoice_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists work_logs_user_date_idx on public.work_logs(user_id, date);

create table if not exists public.calendar_schedules (
  id uuid primary key default gen_random_uuid(),
  app_id text not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  site_app_id text,
  site_name text,
  client_company text,
  work_description text,
  workers text,
  labor_count numeric default 1,
  daily_rate numeric default 0,
  memo text,
  invoice_app_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calendar_schedules_user_date_idx on public.calendar_schedules(user_id, date);

alter table public.work_logs enable row level security;
alter table public.calendar_schedules enable row level security;

drop policy if exists "work logs owner read" on public.work_logs;
drop policy if exists "work logs owner insert" on public.work_logs;
drop policy if exists "work logs owner update" on public.work_logs;
drop policy if exists "work logs owner delete" on public.work_logs;

create policy "work logs owner read" on public.work_logs for select using (user_id = auth.uid() or public.is_admin());
create policy "work logs owner insert" on public.work_logs for insert with check (user_id = auth.uid());
create policy "work logs owner update" on public.work_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "work logs owner delete" on public.work_logs for delete using (user_id = auth.uid());

drop policy if exists "calendar schedules owner read" on public.calendar_schedules;
drop policy if exists "calendar schedules owner insert" on public.calendar_schedules;
drop policy if exists "calendar schedules owner update" on public.calendar_schedules;
drop policy if exists "calendar schedules owner delete" on public.calendar_schedules;

create policy "calendar schedules owner read" on public.calendar_schedules for select using (user_id = auth.uid() or public.is_admin());
create policy "calendar schedules owner insert" on public.calendar_schedules for insert with check (user_id = auth.uid());
create policy "calendar schedules owner update" on public.calendar_schedules for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "calendar schedules owner delete" on public.calendar_schedules for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'genba-files',
  'genba-files',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "genba files owner read" on storage.objects;
drop policy if exists "genba files owner insert" on storage.objects;
drop policy if exists "genba files owner update" on storage.objects;
drop policy if exists "genba files owner delete" on storage.objects;

create policy "genba files owner read" on storage.objects
  for select using (
    bucket_id = 'genba-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "genba files owner insert" on storage.objects
  for insert with check (
    bucket_id = 'genba-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "genba files owner update" on storage.objects
  for update using (
    bucket_id = 'genba-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'genba-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "genba files owner delete" on storage.objects
  for delete using (
    bucket_id = 'genba-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
