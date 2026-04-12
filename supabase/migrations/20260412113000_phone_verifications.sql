create table if not exists public.phone_verifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  password_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0,
  last_sent_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists phone_verifications_phone_idx
  on public.phone_verifications (phone);

create index if not exists phone_verifications_expires_at_idx
  on public.phone_verifications (expires_at);

alter table public.phone_verifications enable row level security;
