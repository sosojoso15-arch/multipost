import Link from "next/link";
import { supabaseServer, currentUser } from "@/lib/supabase/server";
import Composer from "@/components/Composer";
import Plan from "@/components/Plan";
import { limitePosts, planVigente, enPrueba } from "@/lib/plans";

export default async function PanelPage() {
  const user = await currentUser();
  const sb = await supabaseServer();

  const { data: cuentas } = await sb
    .from("accounts")
    .select("id, platform, name, picture_url, last_error")
    .eq("user_id", user!.id)
    .eq("is_active", true)
    .order("platform")
    .order("name");

  const { data: profile } = await sb
    .from("profiles")
    .select("plan, posts_used, trial_ends_at, plan_expires_at")
    .eq("id", user!.id)
    .maybeSingle();

  /* El plan que vale HOY. La columna `plan` sigue diciendo 'pro' un mes
     despues de vencerse, y quien esta en la prueba la tiene en 'free'. */
  const vigente = planVigente(profile);
  const prueba = enPrueba(profile);
  const vencido =
    (profile?.plan ?? "free") !== "free" && vigente === "free" && Boolean(profile?.plan_expires_at);

  if (!cuentas || cuentas.length === 0) {
    return (
      <main className="shell-lectura py-16 text-center sm:py-24">
        <h1 className="text-2xl font-bold">Todavía no tienes cuentas conectadas</h1>
        <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--muted)" }}>
          Es una configuración de una sola vez. Te llevamos paso por paso, son unos 5 minutos.
        </p>
        <Link href="/panel/conectar" className="btn btn-primary mt-6">
          Conectar mis páginas
        </Link>
      </main>
    );
  }

  return (
    <main className="shell py-6 sm:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Nueva publicación</h1>
      </div>

      {/* El plan va arriba y entero, no en una línea de letra pequeña.
          Antes decía "Plan pro" leyendo la columna a secas — que sigue
          diciendo 'pro' un mes después de vencerse. */}
      <div className="mb-5">
        <Plan
          plan={vigente}
          usados={profile?.posts_used ?? 0}
          limite={limitePosts(vigente)}
          enPrueba={prueba}
          hasta={prueba ? (profile?.trial_ends_at ?? null) : (profile?.plan_expires_at ?? null)}
          vencido={vencido}
        />
      </div>

      <Composer cuentas={cuentas} />
    </main>
  );
}
