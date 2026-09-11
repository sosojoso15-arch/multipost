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
 * El plan que vale HOY, que no es lo mismo que la columna `plan`.
 *
 * La columna no se borra sola cuando se vence: dice 'pro' un mes despues de
 * que dejo de estar pagado. Mirar eso a secas regala el servicio para siempre
 * a quien pago una vez.
 *
 * Y al reves: quien esta en la prueba tiene `plan = 'free'` en la columna. Si
 * se mirara solo eso, la prueba daria 30 publicaciones — el plan gratis de
 * toda la vida— que es justo lo contrario de una prueba.
 *
 * Mismo criterio que `plan_vigente()` en la migracion 0005. Si cambia uno,
 * cambia el otro.
 */
export function planVigente(p: EstadoPlan | null | undefined): Plan {
  if (!p) return "free";
  const ahora = Date.now();

  const vence = p.plan_expires_at ? new Date(p.plan_expires_at).getTime() : null;
  if (p.plan && p.plan !== "free" && (vence === null || vence > ahora)) {
    return p.plan as Plan;
  }

  const prueba = p.trial_ends_at ? new Date(p.trial_ends_at).getTime() : null;
  if (prueba !== null && prueba > ahora) return "pro"; // la prueba da lo mismo que Pro

  return "free";
}

/** ¿Esta en los dias de prueba ahora mismo? Para poder decirselo. */
export function enPrueba(p: EstadoPlan | null | undefined): boolean {
  if (!p?.trial_ends_at) return false;
  const fin = new Date(p.trial_ends_at).getTime();
  if (!(fin > Date.now())) return false;
  // Si ya pago, no esta "en prueba": esta pagando.
  const vence = p.plan_expires_at ? new Date(p.plan_expires_at).getTime() : null;
  return !(p.plan && p.plan !== "free" && (vence === null || vence > Date.now()));
}
