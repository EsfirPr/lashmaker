alter table public.phone_verifications
  add column if not exists user_id uuid references public.users(id) on delete cascade;

alter table public.phone_verifications
  drop constraint if exists phone_verifications_purpose_check;

alter table public.phone_verifications
  add constraint phone_verifications_purpose_check
  check (purpose in ('registration', 'login', 'change_phone'));

create index if not exists phone_verifications_user_id_idx
  on public.phone_verifications (user_id);
