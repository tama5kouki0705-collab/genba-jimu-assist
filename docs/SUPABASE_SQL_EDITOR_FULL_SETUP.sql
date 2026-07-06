-- Supabase SQL Editor paste script
-- 目的: 新しいSupabaseプロジェクトに、アプリで必要な表・権限・Storageをまとめて作る。
-- 実行場所: Supabase Dashboard > SQL Editor > New query
-- 注意: URL/Key/Passwordなどの秘密情報はここに貼らない。

create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan text not null default 'Starter' check (plan in ('Starter', 'Professional', 'Business')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company_name text,
  name text,
  phone text,
  email text,
  address text,
  trade text,
  area text,
  invoice_number text,
  bank_name text,
  bank_branch text,
  bank_type text,
  bank_account_number text,
  bank_account_name text,
  created_at timestamptz not null default now()
);

create unique index profiles_user_id_key on public.profiles(user_id);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  site_name text not null,
  address text,
  client_company text,
  client_person text,
  client_phone text,
  start_date date,
  end_date date,
  work_description text,
  daily_rate numeric default 0,
  memo text,
  created_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  image_url text,
  date date,
  store_name text,
  amount numeric default 0,
  tax_amount numeric default 0,
  purpose text,
  memo text,
  status text not null default '未処理',
  ocr_status text not null default '未実行',
  created_at timestamptz not null default now()
);

create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  qualification_name text not null,
  acquired_date date,
  expiry_date date,
  image_url text,
  memo text,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  vehicle_name text not null,
  vehicle_number text,
  vehicle_type text,
  inspection_expiry_date date,
  compulsory_insurance_expiry_date date,
  optional_insurance_expiry_date date,
  inspection_document_url text,
  compulsory_insurance_document_url text,
  optional_insurance_document_url text,
  memo text,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  site_name text,
  client_company text not null,
  work_description text,
  work_date date,
  labor_count numeric default 0,
  daily_rate numeric default 0,
  material_cost numeric default 0,
  other_cost numeric default 0,
  tax_rate numeric default 10,
  subtotal numeric default 0,
  tax_amount numeric default 0,
  total_amount numeric default 0,
  status text not null default '下書き',
  pdf_url text,
  created_at timestamptz not null default now()
);

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  site_name text,
  client_company text not null,
  work_description text,
  quantity numeric default 0,
  unit text,
  unit_price numeric default 0,
  tax_rate numeric default 10,
  subtotal numeric default 0,
  tax_amount numeric default 0,
  total_amount numeric default 0,
  expiry_date date,
  status text not null default '下書き',
  pdf_url text,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  type text not null,
  title text not null,
  file_url text,
  expiry_date date,
  memo text,
  created_at timestamptz not null default now()
);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.receipts enable row level security;
alter table public.qualifications enable row level security;
alter table public.vehicles enable row level security;
alter table public.invoices enable row level security;
alter table public.estimates enable row level security;
alter table public.documents enable row level security;
alter table public.admin_notes enable row level security;

create policy "users can read own user" on public.users for select using (id = auth.uid() or public.is_admin());
create policy "admins can update users" on public.users for update using (public.is_admin()) with check (public.is_admin());

create policy "profiles owner read" on public.profiles for select using (user_id = auth.uid() or public.is_admin());
create policy "profiles owner insert" on public.profiles for insert with check (user_id = auth.uid());
create policy "profiles owner update" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "sites owner read" on public.sites for select using (user_id = auth.uid() or public.is_admin());
create policy "sites owner insert" on public.sites for insert with check (user_id = auth.uid());
create policy "sites owner update" on public.sites for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sites owner delete" on public.sites for delete using (user_id = auth.uid());

create policy "receipts owner read" on public.receipts for select using (user_id = auth.uid() or public.is_admin());
create policy "receipts owner insert" on public.receipts for insert with check (user_id = auth.uid());
create policy "receipts owner update" on public.receipts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "receipts owner delete" on public.receipts for delete using (user_id = auth.uid());

create policy "qualifications owner read" on public.qualifications for select using (user_id = auth.uid() or public.is_admin());
create policy "qualifications owner insert" on public.qualifications for insert with check (user_id = auth.uid());
create policy "qualifications owner update" on public.qualifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "qualifications owner delete" on public.qualifications for delete using (user_id = auth.uid());

create policy "vehicles owner read" on public.vehicles for select using (user_id = auth.uid() or public.is_admin());
create policy "vehicles owner insert" on public.vehicles for insert with check (user_id = auth.uid());
create policy "vehicles owner update" on public.vehicles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "vehicles owner delete" on public.vehicles for delete using (user_id = auth.uid());

create policy "invoices owner read" on public.invoices for select using (user_id = auth.uid() or public.is_admin());
create policy "invoices owner insert" on public.invoices for insert with check (user_id = auth.uid());
create policy "invoices owner update" on public.invoices for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "invoices owner delete" on public.invoices for delete using (user_id = auth.uid());

create policy "estimates owner read" on public.estimates for select using (user_id = auth.uid() or public.is_admin());
create policy "estimates owner insert" on public.estimates for insert with check (user_id = auth.uid());
create policy "estimates owner update" on public.estimates for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "estimates owner delete" on public.estimates for delete using (user_id = auth.uid());

create policy "documents owner read" on public.documents for select using (user_id = auth.uid() or public.is_admin());
create policy "documents owner insert" on public.documents for insert with check (user_id = auth.uid());
create policy "documents owner update" on public.documents for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "documents owner delete" on public.documents for delete using (user_id = auth.uid());

create policy "admin notes admin read" on public.admin_notes for select using (public.is_admin());
create policy "admin notes admin insert" on public.admin_notes for insert with check (public.is_admin());
create policy "admin notes admin update" on public.admin_notes for update using (public.is_admin()) with check (public.is_admin());

-- Commercial foundation

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

create policy "work logs owner read" on public.work_logs for select using (user_id = auth.uid() or public.is_admin());
create policy "work logs owner insert" on public.work_logs for insert with check (user_id = auth.uid());
create policy "work logs owner update" on public.work_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "work logs owner delete" on public.work_logs for delete using (user_id = auth.uid());

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
