-- ============================================================
--  Multi-Post  ·  camino corto para entrar
--
--  En vez de que el cliente cree su propia app de Meta —cinco pasos—
--  pide acceso, y el dueno lo mete como Tester de NUESTRA app. Un rol
--  de Tester puede usar todos los permisos sin App Review, porque la
--  app esta en modo Desarrollo.
--
--  Ojo con el limite: 50 testers si la app no esta vinculada a un
--  Business Manager, 500 si lo esta y el negocio esta verificado.
--  Pasado eso, toca App Review o volver al asistente de cinco pasos.
-- ============================================================

create table if not exists public.tester_requests (
  id           uuid primary key default gen_random_uuid(),

  -- Uno por persona: pedir dos veces no crea dos filas.
  user_id      uuid not null unique references auth.users(id) on delete cascade,

  -- El usuario o correo DE FACEBOOK, que no tiene por que ser el correo
  -- con el que se registro aqui. Meta busca por cuenta de Facebook.
  facebook_ref text not null,

  estado       text not null default 'pendiente'
               check (estado in ('pendiente','listo','rechazado')),

  -- Por que se rechazo, o cualquier cosa que el dueno quiera apuntar.
  nota         text,

  -- Cuando se le aviso al cliente. Null = todavia no se le ha avisado.
  avisado_at   timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tester_requests_estado_idx
  on public.tester_requests (estado, created_at);

alter table public.tester_requests enable row level security;

-- Cada quien ve y crea LA SUYA. Cambiarla de estado no puede nadie desde
-- el navegador: eso lo hace el dueno con la llave de servicio, que se
-- salta estas reglas. Si un cliente pudiera escribir `estado`, se pondria
-- 'listo' el solo y se saltaria la fila.
drop policy if exists "su solicitud"      on public.tester_requests;
drop policy if exists "pedir la suya"     on public.tester_requests;

create policy "su solicitud" on public.tester_requests
  for select using (auth.uid() = user_id);

create policy "pedir la suya" on public.tester_requests
  for insert with check (auth.uid() = user_id);
