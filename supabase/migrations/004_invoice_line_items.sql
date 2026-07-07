-- Invoice line items for v1.0 test distribution.
-- Existing invoices receive [] and continue to render from legacy amount fields.
alter table public.invoices
  add column if not exists line_items jsonb not null default '[]'::jsonb;

comment on column public.invoices.line_items is 'Editable invoice line items stored by the app. Rollback: alter table public.invoices drop column if exists line_items;';
