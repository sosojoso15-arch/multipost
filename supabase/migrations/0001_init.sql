-- ============================================================
--  Multi-Post  ·  esquema inicial
--  Cada usuario trae SU PROPIA app de Facebook (su App ID).
--  Nosotros nunca somos duenos de sus tokens: solo los guardamos
--  cifrados por cuenta, aislados con Row Level Security.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- perfiles  (1 a 1 con auth.users de Supabase)
-- ------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  plan          text not null default 'free'
                check (plan in ('free','pro','agency')),
  posts_used    int  not null default 0,   -- se reinicia cada mes
  period_start  date not null default date_trunc('month', now())::date,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- meta_apps : la app de Facebook que crea CADA usuario
--   app_secret es obligatorio en la practica: sin el no se puede
--   cambiar el ?code= de OAuth por un token. Va cifrado.
-- ------------------------------------------------------------
create table public.meta_apps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  app_id      text not null,
  app_secret_enc text,
  graph_ver   text not null default 'v23.0',
  verified_at timestamptz,               -- ultima vez que la probamos ok
  created_at  timestamptz not null default now(),
  unique (user_id, app_id)
);

-- ------------------------------------------------------------
-- accounts : cada pagina de Facebook / cuenta de Instagram
-- ------------------------------------------------------------
create table public.accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  meta_app_id   uuid not null references public.meta_apps(id) on delete cascade,
  platform      text not null check (platform in ('facebook','instagram')),
  external_id   text not null,           -- page id  /  ig business id
  name          text not null,
  picture_url   text,
  -- token de pagina, cifrado AES-256-GCM en el servidor (base64)
  token_enc     text not null,
  token_expires_at timestamptz,          -- null = no caduca (page token)
  is_active     boolean not null default true,
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, platform, external_id)
);

create index accounts_user_idx on public.accounts(user_id) where is_active;

-- ------------------------------------------------------------
-- posts : una publicacion, puede ir a varias cuentas
-- ------------------------------------------------------------
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  message       text,
  link          text,
  media         jsonb not null default '[]'::jsonb,  -- [{url,type}]
  status        text not null default 'draft'
                check (status in ('draft','scheduled','publishing','done','failed')),
  scheduled_at  timestamptz,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index posts_due_idx
  on public.posts (scheduled_at)
  where status = 'scheduled';

-- ------------------------------------------------------------
-- post_targets : resultado por cada cuenta destino
-- ------------------------------------------------------------
create table public.post_targets (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  account_id   uuid not null references public.accounts(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','ok','error')),
  remote_id    text,                     -- id del post en Facebook
  error_code   int,
  error_msg    text,
  attempts     int not null default 0,
  completed_at timestamptz,
  unique (post_id, account_id)
);

create index post_targets_post_idx on public.post_targets(post_id);

-- ============================================================
--  Row Level Security : cada quien SOLO ve lo suyo
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.meta_apps    enable row level security;
alter table public.accounts     enable row level security;
alter table public.posts        enable row level security;
alter table public.post_targets enable row level security;

create policy "propio perfil" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "propias apps" on public.meta_apps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "propias cuentas" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "propios posts" on public.posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ojo: hay que exigir las DOS cosas. Si solo se revisa el post, un usuario
-- podria apuntar un destino suyo a la cuenta de otro cliente, y el cron
-- (que corre con service role y se salta el RLS) publicaria ahi.
create policy "propios targets" on public.post_targets
  for all using (
    exists (select 1 from public.posts p
            where p.id = post_targets.post_id and p.user_id = auth.uid())
    and
    exists (select 1 from public.accounts a
            where a.id = post_targets.account_id and a.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.posts p
            where p.id = post_targets.post_id and p.user_id = auth.uid())
    and
    exists (select 1 from public.accounts a
            where a.id = post_targets.account_id and a.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- perfil automatico al registrarse
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- limite del plan gratis
-- ------------------------------------------------------------
create or replace function public.plan_limit(p_plan text)
returns int language sql immutable as $$
  select case p_plan
    when 'free'   then 30
    when 'pro'    then 1000
    when 'agency' then 100000
    else 0 end;
$$;
