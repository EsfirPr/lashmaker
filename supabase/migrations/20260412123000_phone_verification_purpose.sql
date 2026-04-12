alter table public.phone_verifications
  add column if not exists purpose text not null default 'registration';

update public.phone_verifications
set purpose = 'registration'
where purpose is null;

alter table public.phone_verifications
  drop constraint if exists phone_verifications_phone_key;

drop index if exists phone_verifications_phone_idx;

alter table public.phone_verifications
  add constraint phone_verifications_purpose_check
  check (purpose in ('registration', 'login'));

create unique index if not exists phone_verifications_phone_purpose_idx
  on public.phone_verifications (phone, purpose);

create index if not exists phone_verifications_phone_idx
  on public.phone_verifications (phone);
