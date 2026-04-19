create table if not exists public.master_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  price integer not null,
  duration text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint master_services_price_check
    check (price >= 0)
);

create index if not exists master_services_owner_id_idx
  on public.master_services (owner_id);

create index if not exists master_services_created_at_idx
  on public.master_services (created_at asc);

alter table public.master_services enable row level security;
