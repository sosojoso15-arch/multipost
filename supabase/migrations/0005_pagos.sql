-- ============================================================
-- Cobro con Wompi: prueba de 3 dias y despues 45 USD al mes.
--
-- Wompi solo cobra en PESOS. El precio se fija en dolares y se
-- convierte con la TRM del dia, asi que el monto en pesos cambia
-- cada dia. Por eso se guarda lo que se cobro DE VERDAD —monto,
-- moneda y tasa— y no solo "45 USD": dentro de un anio nadie va a
-- poder reconstruir a cuanto estaba el dolar ese martes.
-- ============================================================

-- ------------------------------------------------------------
-- Cuando se le acaba la prueba y hasta cuando le vale el plan.
--
-- Los dos pueden ser nulos y NO significan lo mismo:
--   trial_ends_at nulo  -> cuenta vieja, sin prueba
--   plan_expires_at nulo -> nunca ha pagado, o el plan no vence
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists trial_ends_at   timestamptz,
  add column if not exists plan_expires_at timestamptz;

-- A quien ya esta registrado se le regala la prueba desde hoy.
-- Sin esto, todos los que entraron antes se quedarian sin nada de
-- un dia para otro, que es una forma fea de estrenar el cobro.
update public.profiles
   set trial_ends_at = now() + interval '3 days'
 where trial_ends_at is null;

-- Y a los que lleguen, desde que se registran.
alter table public.profiles
  alter column trial_ends_at set default now() + interval '3 days';

-- ------------------------------------------------------------
-- Los pagos.
--
-- `reference` es lo que Wompi devuelve para saber de que pago
-- habla, y es UNICA a proposito: si un evento llega dos veces
-- —Wompi reintenta a los 30 min, 3 h y 24 h— el segundo no puede
-- crear otra fila ni regalar otro mes.
-- ------------------------------------------------------------
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  reference       text not null unique,

  -- Lo que se cobro de verdad, en pesos y en centavos, como lo pide
  -- Wompi. Guardar pesos con decimales invita a errores de redondeo.
  amount_in_cents bigint not null,
  currency        text   not null default 'COP',

  -- Y de donde salio ese numero: 45 USD a la TRM de ese momento.
  usd             numeric(10,2) not null,
  trm             numeric(14,4),

  -- Estados de Wompi: PENDING mientras no responde, y despues
  -- APPROVED / DECLINED / VOIDED / ERROR.
  status          text not null default 'PENDING',
  transaction_id  text,

  -- El evento entero, por si hay que discutir un cobro.
  payload         jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

-- Cada quien ve SUS pagos y nada mas. Escribir no puede nadie desde
-- el navegador: los crea el servidor y los actualiza el webhook, los
-- dos con la llave de servicio, que se salta estas reglas.
drop policy if exists "sus pagos" on public.payments;
create policy "sus pagos" on public.payments
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- ¿Este usuario puede publicar hoy?
--
-- Vale si esta en prueba, o si pago y no se le ha vencido. El plan
-- gratis sigue existiendo con su tope, para quien no quiera pagar.
-- ------------------------------------------------------------
create or replace function public.plan_vigente(p_id uuid)
returns text language sql stable as $$
  select case
    when p.plan <> 'free' and (p.plan_expires_at is null or p.plan_expires_at > now())
      then p.plan
    when p.trial_ends_at is not null and p.trial_ends_at > now()
      then 'pro'          -- la prueba da lo mismo que Pro
    else 'free'
  end
  from public.profiles p
  where p.id = p_id;
$$;
