alter table public.work_logs
  add column if not exists trade_details jsonb;
