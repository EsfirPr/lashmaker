create extension if not exists "pgcrypto";

create table if not exists public.time_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint time_slots_time_range_check check (start_time < end_time)
);

create unique index if not exists time_slots_unique_window_idx
  on public.time_slots (slot_date, start_time, end_time);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  style text not null,
  notes text,
  slot_id uuid not null references public.time_slots(id) on delete restrict,
  status text not null default 'confirmed',
  public_token text not null unique,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint bookings_status_check check (status in ('confirmed', 'cancelled'))
);

create unique index if not exists bookings_one_active_booking_per_slot_idx
  on public.bookings (slot_id)
  where status = 'confirmed';

create index if not exists bookings_public_token_idx on public.bookings (public_token);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_reminder_sent_idx on public.bookings (reminder_sent);

alter table public.time_slots enable row level security;
alter table public.bookings enable row level security;

