import { secreto } from "@/lib/env";

export type Plan = "free" | "pro" | "agency";

/**
 * Publicaciones por mes.
 *
 * `free` da CERO a proposito: se decidio cobrar antes de dar acceso, y un
 * plan gratis de 30 al mes dejaba publicando a quien se le vencio el plan.
 * "free" aqui no es un plan, es "no tiene plan".
 *
 * Debe coincidir con plan_limit() en la migracion 0009.
 */
export const LIMITE_POSTS: Record<Plan, number> = {
  free: 0,
  pro: 1000,
  agency: 100000,
};

export function limitePosts(plan: string | null | undefined): number {
  return LIMITE_POSTS[(plan ?? "free") as Plan] ?? 0;
}

/**
 * Interruptor de "abierto gratis mientras probamos".
 *
 * Con el secreto MODO_GRATIS puesto en 1, cualquiera entra y publica sin
 * pagar. NO se quito nada del cobro: el checkout de Wompi, el webhook, el
 * precio y la pantalla de pago siguen enteros y siguen funcionando. Esto
 * solo deja de exigirlo en la puerta.
 *
 * Para volver a cobrar:
 *   npx wrangler secret delete MODO_GRATIS
 *
 * Y para abrirlo otra vez:
 *   echo 1 | npx wrangler secret put MODO_GRATIS
 *
 * Es un secreto y no una linea de codigo a proposito: asi se prende y se
 * apaga sin tocar el repo ni volver a desplegar.
 *
 * Ojo con una cosa cuando se vuelva a cerrar: a quien entro gratis le queda
 * `plan = 'free'` en la base —aqui no se le escribe nada—, asi que al apagar
 * el interruptor queda fuera de una. Eso es lo que se quiere, pero hay que
 * avisarle antes.
 */
export function modoGratis(): boolean {
  const v = (secreto("MODO_GRATIS") ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "si" || v === "sí";
}

/** Lo que se le da a quien entra sin pagar mientras esta abierto gratis. */
const PLAN_DE_PRUEBA: Plan = "pro";

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
  // Mientras este abierto gratis, la puerta no pregunta.
  if (modoGratis()) return true;

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
  /* Abierto gratis: a quien no tiene nada se le presta el plan de prueba.
     Sin esto la puerta lo deja pasar pero el limite seria 0 y no publicaria
     nada. A quien SI pago se le respeta el suyo, que puede ser mayor. */
  if (modoGratis() && (!p?.plan || p.plan === "free")) return PLAN_DE_PRUEBA;

  return haPagado(p) ? (p!.plan as Plan) : "free";
}
