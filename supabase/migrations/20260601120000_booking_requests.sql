create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  phone text not null,
  style text not null,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  constraint booking_requests_status_check
    check (status in ('pending', 'processed'))
);

create index if not exists booking_requests_user_id_idx
  on public.booking_requests (user_id);

create index if not exists booking_requests_status_idx
  on public.booking_requests (status);

create index if not exists booking_requests_created_at_idx
  on public.booking_requests (created_at desc);

alter table public.booking_requests enable row level security;
