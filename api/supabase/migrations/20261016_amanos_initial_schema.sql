-- Ya aplicada en el proyecto Supabase "amanos" (tmunyznxxbdfosaflhwy). Se guarda aquí como referencia.
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar not null,
  name varchar not null,
  avatar varchar,
  "googleSub" varchar,
  "createdAt" timestamp not null default now()
);
create unique index users_email_key on public.users (email);

create table public.sign_progress (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  "signId" varchar not null,
  seen boolean not null default false,
  "bestScore" integer not null default 0,
  mastered boolean not null default false,
  "masteredAt" varchar,
  attempts integer not null default 0,
  constraint sign_progress_user_sign_key unique ("userId", "signId"),
  constraint sign_progress_score_range check ("bestScore" between 0 and 100)
);

create table public.day_activity (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  day varchar not null,
  xp integer not null default 0,
  seen text not null default '[]',
  mastered text not null default '[]',
  scores text not null default '[]',
  constraint day_activity_user_day_key unique ("userId", day)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  "planId" varchar not null,
  status varchar not null default 'active',
  "updatedAt" timestamp not null default now(),
  constraint subscriptions_user_key unique ("userId")
);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email varchar not null,
  source varchar not null default 'landing',
  "createdAt" timestamp not null default now()
);
create unique index waitlist_email_key on public.waitlist (email);

-- La API entra como rol postgres (ignora RLS). Sin políticas, la API REST pública de Supabase no ve nada.
alter table public.users enable row level security;
alter table public.sign_progress enable row level security;
alter table public.day_activity enable row level security;
alter table public.subscriptions enable row level security;
alter table public.waitlist enable row level security;
