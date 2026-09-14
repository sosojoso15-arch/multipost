import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { haPagado } from "@/lib/plans";
import { appNuestra } from "@/lib/appNuestra";
import { guardarCuentas } from "@/lib/conectarCuentas";
import { MetaError } from "@/lib/meta";

export const maxDuration = 120;

/**
 * Conectar desde el SDK de JavaScript.
 *
 * Existe por el telefono: la vuelta normal de OAuth se la traga la app de
 * Facebook, que intercepta cualquier enlace a facebook.com y nunca devuelve
 * al cliente. El SDK no sale de la pagina, asi que no hay enlace que
 * interceptar.
 *
 * El navegador manda el token de usuario que le dio Facebook. Aqui se cambia
 * por uno largo —con NUESTRO secreto, que nunca sale del servidor— y se
 * guardan las paginas.
 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tu sesión venció." }, { status: 401 });

  const { data: perfil } = await sb
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!haPagado(perfil)) {
    return NextResponse.json({ error: "Primero hay que pagar el plan." }, { status: 402 });
  }

  const nuestra = appNuestra();
  if (!nuestra) {
    return NextResponse.json({ error: "Falta configurar nuestra app." }, { status: 500 });
  }

  const { token } = (await req.json()) as { token?: string };
  if (!token) return NextResponse.json({ error: "Falta el token" }, { status: 400 });

  try {
    const r = await guardarCuentas({
      sb,
      userId: user.id,
      token,
      appId: nuestra.appId,
      appSecret: nuestra.appSecret,
      graphVer: nuestra.graphVer,
      configId: nuestra.configId,
    });

    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, cuentas: r.cuentas });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof MetaError ? e.message : "Error hablando con Facebook." },
      { status: 502 },
    );
  }
}
