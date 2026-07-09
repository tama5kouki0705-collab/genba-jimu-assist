alter table public.work_logs
  add column if not exists weather text,
  add column if not exists progress_percent numeric,
  add column if not exists foreman text,
  add column if not exists machinery text,
  add column if not exists waste_record text,
  add column if not exists tomorrow_plan text,
  add column if not exists notes text;
