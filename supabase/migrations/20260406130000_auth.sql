create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  nickname text unique,
  password_hash text not null,
  role text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint users_role_check check (role in ('master', 'client'))
);

create unique index if not exists users_one_master_idx
  on public.users (role)
  where role = 'master';

alter table public.bookings
  add column if not exists user_id uuid references public.users(id) on delete set null;

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists users_role_idx on public.users (role);

alter table public.users enable row level security;

