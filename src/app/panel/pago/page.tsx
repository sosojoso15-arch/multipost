import Link from "next/link";
import { supabaseServer, currentUser } from "@/lib/supabase/server";

/**
 * Donde cae la gente al volver de Wompi.
 *
 * ── Por que no se cree lo que dice la URL ──
 *
 * Wompi devuelve `?id=...` y a veces el estado en la direccion. Eso lo puede
 * escribir cualquiera a mano. Quien decide si esta pagado es el WEBHOOK, que
 * llega firmado por separado. Aqui solo se mira la base de datos.
 *
 * Y el webhook puede tardar unos segundos, asi que cuando todavia no ha
 * llegado no se dice "fallo": se dice que se esta confirmando.
 */
export default async function PagoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await searchParams; // se acepta pero no se usa para decidir nada
  const user = await currentUser();
  const sb = await supabaseServer();

  const { data: perfil } = await sb
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: ultimo } = await sb
    .from("payments")
    .select("status, amount_in_cents, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const vigente =
    (perfil?.plan ?? "free") !== "free" &&
    (!perfil?.plan_expires_at || new Date(perfil.plan_expires_at) > new Date());

  const estado = ultimo?.status ?? "PENDING";

  let titulo: string;
  let texto: string;

  if (vigente && estado === "APPROVED") {
    titulo = "Listo, ya estás en Pro";
    texto = perfil?.plan_expires_at
      ? `Te vale hasta el ${new Date(perfil.plan_expires_at).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      : "Ya puedes publicar sin el tope del plan gratis.";
  } else if (estado === "PENDING") {
    titulo = "Estamos confirmando el pago";
    texto =
      "El banco puede tardar unos segundos en avisarnos. Recarga esta página en un momento; si ya pagaste, no vuelvas a pagar.";
  } else if (estado === "DECLINED") {
    titulo = "El banco rechazó el pago";
    texto = "No se te cobró nada. Puedes intentarlo otra vez o con otro medio de pago.";
  } else {
    titulo = "No se pudo completar el pago";
    texto = "No se te cobró nada. Inténtalo de nuevo; si vuelve a fallar, escríbenos.";
  }

  return (
    <main className="shell-lectura py-16 text-center sm:py-24">
      <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
      <p className="mx-auto mt-2 max-w-prose text-sm" style={{ color: "var(--muted)" }}>
        {texto}
      </p>
      <Link href="/panel" className="btn btn-primary mt-6">
        Volver a publicar
      </Link>
    </main>
  );
}
