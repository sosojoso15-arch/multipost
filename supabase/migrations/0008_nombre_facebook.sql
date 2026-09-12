-- ============================================================
--  Multi-Post  ·  nombre de Facebook y correo, obligatorios
--
--  Con solo el correo no basta: el buscador de Meta devuelve varias
--  cuentas parecidas, e invitar a la equivocada le da acceso a los
--  permisos de la app a un desconocido. El nombre tal como aparece
--  en Facebook desempata.
--
--  La columna queda opcional en la BASE a proposito: las solicitudes
--  que ya existen no tienen nombre, y ponerlo obligatorio aqui haria
--  fallar la migracion. Quien lo exige es el formulario, para las
--  nuevas.
-- ============================================================

alter table public.tester_requests
  add column if not exists nombre_fb text;

comment on column public.tester_requests.nombre_fb is
  'El nombre tal como aparece en Facebook. Sirve para no invitar a la cuenta equivocada.';
