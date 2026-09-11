-- ============================================================
--  Multi-Post  ·  soporte para "Inicio de sesion con Facebook para empresas"
--
--  Las apps de tipo Negocios no traen el login clasico: traen
--  "Facebook Login for Business", que usa un config_id en vez de scope.
--  El config_id sale de una "configuracion" que el cliente crea dentro
--  de ese producto, y ahi mismo elige permisos y paginas.
--
--  Es opcional: si esta vacio, mandamos scope como siempre.
-- ============================================================

alter table public.meta_apps
  add column if not exists config_id text;

comment on column public.meta_apps.config_id is
  'Configuration ID de Facebook Login for Business. Null = usar scope clasico.';
