import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { haPagado } from "@/lib/plans";

/**
 * Guarda (o actualiza) la app de Meta que creo el usuario.
 * El App Secret es obligatorio: sin el no se puede cambiar el ?code=
 * por un token, que es como funciona todo el flujo.
 */

/** Cobrar antes de dar acceso. La pantalla ya lo bloquea, pero eso se salta
 *  con una peticion a mano: la reja de verdad va aqui. */
async function tienePlan(sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string) {
  const { data } = await sb
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", userId)
    .maybeSingle();
  return haPagado(data);
}

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!(await tienePlan(sb, user.id))) {
    return NextResponse.json({ error: "Primero hay que pagar el plan." }, { status: 402 });
  }

  const body = (await req.json()) as {
    appId?: string;
    graphVer?: string;
    appSecret?: string;
    configId?: string;
  };

  const appId = body.appId?.trim();
  if (!appId || !/^\d{10,25}$/.test(appId)) {
    return NextResponse.json({ error: "App ID inválido: deben ser solo números" }, { status: 400 });
  }

  const secret = body.appSecret?.trim();

  // Si ya habia uno guardado, dejar cambiarlo es opcional.
  const { data: previo } = await sb
    .from("meta_apps")
    .select("app_secret_enc")
    .eq("user_id", user.id)
    .eq("app_id", appId)
    .maybeSingle();

  if (!secret && !previo?.app_secret_enc) {
    return NextResponse.json(
      { error: "Falta el App Secret. Sin él Facebook no deja conectar." },
      { status: 400 },
    );
  }

  if (secret && !/^[a-f0-9]{32}$/i.test(secret)) {
    return NextResponse.json(
      { error: "Ese App Secret no tiene la forma correcta: son 32 caracteres entre a-f y 0-9." },
      { status: 400 },
    );
  }

  // Solo lo traen las apps de tipo Negocios. Vacio = usar scope clasico.
  const configId = body.configId?.trim() ?? "";
  if (configId && !/^\d{10,25}$/.test(configId)) {
    return NextResponse.json(
      { error: "El Configuration ID deben ser solo números." },
      { status: 400 },
    );
  }

  const { data, error } = await sb
    .from("meta_apps")
    .upsert(
      {
        user_id: user.id,
        app_id: appId,
        graph_ver: body.graphVer ?? "v23.0",
        config_id: configId || null,
        ...(secret ? { app_secret_enc: encrypt(secret) } : {}),
      },
      { onConflict: "user_id,app_id" },
    )
    .select("id, app_id, graph_ver, config_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ app: data });
}
