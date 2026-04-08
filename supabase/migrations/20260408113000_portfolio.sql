create table if not exists public.master_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text,
  headline text,
  bio text,
  years_experience integer,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint master_profiles_years_experience_check
    check (years_experience is null or years_experience >= 0)
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  image_path text not null,
  image_url text not null,
  caption text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists portfolio_items_owner_id_idx
  on public.portfolio_items (owner_id);

create index if not exists portfolio_items_created_at_idx
  on public.portfolio_items (created_at desc);

alter table public.master_profiles enable row level security;
alter table public.portfolio_items enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio',
  'portfolio',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
