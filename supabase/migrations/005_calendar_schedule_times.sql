alter table public.calendar_schedules
  add column if not exists start_time text,
  add column if not exists end_time text;
