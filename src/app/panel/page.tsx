import Link from "next/link";
import { supabaseServer, currentUser } from "@/lib/supabase/server";
import Composer from "@/components/Composer";

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
    .select("plan, posts_used")
    .eq("id", user!.id)
    .maybeSingle();

  if (!cuentas || cuentas.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-16 text-center">
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
    <main className="mx-auto w-full max-w-4xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Nueva publicación</h1>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Plan {profile?.plan ?? "free"} · {profile?.posts_used ?? 0} publicaciones este mes
        </p>
      </div>

      <Composer cuentas={cuentas} />
    </main>
  );
}
