export type Plan = "free" | "pro" | "agency";

/** Publicaciones por mes. Debe coincidir con plan_limit() en la migracion 0001. */
export const LIMITE_POSTS: Record<Plan, number> = {
  free: 30,
  pro: 1000,
  agency: 100000,
};

export function limitePosts(plan: string | null | undefined): number {
  return LIMITE_POSTS[(plan ?? "free") as Plan] ?? 0;
}

/** Lo que hace falta saber de alguien para decir que plan tiene HOY. */
export type EstadoPlan = {
  plan?: string | null;
  trial_ends_at?: string | null;
  plan_expires_at?: string | null;
};

/**
 * ¿Tiene un plan PAGADO y vigente?
 *
 * Es la unica puerta para conectar paginas. Se decidio cobrar primero y
 * despues dar acceso: invitar a alguien como Evaluador en Meta es trabajo
 * manual, y hacerlo para quien no ha pagado sale caro en tiempo.
 *
 * La columna `plan` no se limpia sola al vencerse —sigue diciendo 'pro' un
 * mes despues—, por eso siempre hay que mirar tambien `plan_expires_at`.
 */
export function haPagado(p: EstadoPlan | null | undefined): boolean {
  if (!p?.plan || p.plan === "free") return false;
  const vence = p.plan_expires_at ? new Date(p.plan_expires_at).getTime() : null;
  return vence === null || vence > Date.now();
}

/**
 * El plan que vale HOY, que no es lo mismo que la columna `plan`.
 *
 * La columna no se borra sola cuando se vence: dice 'pro' un mes despues de
 * que dejo de estar pagado. Mirar eso a secas regala el servicio para siempre
 * a quien pago una vez.
 *
 * La prueba de 3 dias ya NO da plan: se decidio cobrar antes de dar acceso.
 * La columna `trial_ends_at` se queda en la base por las cuentas viejas, pero
 * no la mira nadie.
 */
export function planVigente(p: EstadoPlan | null | undefined): Plan {
  return haPagado(p) ? (p!.plan as Plan) : "free";
}
