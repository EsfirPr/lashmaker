alter table public.master_profiles
  add column if not exists lash_experience_years integer,
  add column if not exists avatar_path text,
  add column if not exists avatar_url text;

alter table public.master_profiles
  drop constraint if exists master_profiles_lash_experience_years_check;

alter table public.master_profiles
  add constraint master_profiles_lash_experience_years_check
    check (lash_experience_years is null or lash_experience_years >= 0);

create table if not exists public.master_certificates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  image_path text not null,
  image_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists master_certificates_owner_id_idx
  on public.master_certificates (owner_id);

create index if not exists master_certificates_created_at_idx
  on public.master_certificates (created_at desc);

alter table public.master_certificates enable row level security;
