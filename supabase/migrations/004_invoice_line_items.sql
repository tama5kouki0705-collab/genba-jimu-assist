alter table public.invoices
  add column if not exists line_items jsonb not null default '[]'::jsonb;
