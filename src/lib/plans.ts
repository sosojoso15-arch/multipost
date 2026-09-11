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
