alter table public.master_services
  add column if not exists image_path text,
  add column if not exists image_url text;
