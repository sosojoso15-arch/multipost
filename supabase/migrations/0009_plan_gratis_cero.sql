-- ============================================================
--  Multi-Post  ·  el plan gratis ya no da publicaciones
--
--  Se decidio cobrar ANTES de dar acceso. Con plan_limit('free') = 30,
--  a quien se le vencia el plan bajaba a gratis y seguia publicando
--  treinta al mes con las paginas que ya tenia conectadas. O sea que
--  el cobro no bloqueaba nada.
--
--  'free' aqui no es un plan: es "no tiene plan".
--
--  Tiene que coincidir con LIMITE_POSTS en src/lib/plans.ts.
--  Si cambia uno, cambia el otro.
-- ============================================================

create or replace function public.plan_limit(p_plan text)
returns int language sql immutable as $$
  select case p_plan
    when 'free'   then 0
    when 'pro'    then 1000
    when 'agency' then 100000
    else 0 end;
$$;

-- ------------------------------------------------------------
--  La prueba de 3 dias tampoco da plan.
--
--  Misma razon: si el acceso exige pago, una prueba que da acceso lo
--  contradice. La columna trial_ends_at se queda por las cuentas
--  viejas, pero ya no la mira nadie.
--
--  Mismo criterio que planVigente() en src/lib/plans.ts.
-- ------------------------------------------------------------
create or replace function public.plan_vigente(p_id uuid)
returns text language sql stable as $$
  select case
    when p.plan <> 'free' and (p.plan_expires_at is null or p.plan_expires_at > now())
      then p.plan
    else 'free'
  end
  from public.profiles p
  where p.id = p_id;
$$;

-- Y a quien se registre ya no se le regala la prueba.
alter table public.profiles
  alter column trial_ends_at drop default;
