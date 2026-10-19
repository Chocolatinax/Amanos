begin;
create table if not exists public.sign_settings (
  "signId" varchar primary key,
  content text not null default '{}',
  reference text,
  revision integer not null default 1,
  "updatedAt" timestamp not null default now()
);
alter table public.sign_settings enable row level security;
revoke all on public.sign_settings from anon, authenticated;
commit;
