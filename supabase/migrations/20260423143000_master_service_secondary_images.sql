alter table public.master_services
  add column if not exists secondary_image_path text,
  add column if not exists secondary_image_url text;
