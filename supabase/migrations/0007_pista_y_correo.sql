-- ============================================================
--  Multi-Post  ·  mas datos en la solicitud de acceso
--
--  Buscar por correo en Meta no siempre da: unos tienen el Facebook
--  con otro correo, y otras veces salen tres cuentas parecidas. Una
--  pista —como se ve su foto, el nombre que muestra, la ciudad—
--  resuelve eso en segundos.
--
--  Y el correo donde avisarle no tiene por que ser con el que se
--  registro aqui.
-- ============================================================

alter table public.tester_requests
  add column if not exists pista        text,
  add column if not exists correo_aviso text;

comment on column public.tester_requests.pista is
  'Como reconocerlo en Meta: foto, nombre que muestra, ciudad. Lo escribe el cliente.';
comment on column public.tester_requests.correo_aviso is
  'Donde avisarle. Si esta vacio se usa el correo de su cuenta.';
