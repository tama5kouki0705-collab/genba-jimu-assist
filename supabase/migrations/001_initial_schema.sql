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
