import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { authorizeUrl } from "@/lib/meta";
import { STATE_COOKIE, redirectUri, popupResponse } from "@/lib/metaOauth";
import { haPagado } from "@/lib/plans";
import { appNuestra, faltaDeAppNuestra } from "@/lib/appNuestra";

/**
 * Manda al cliente a la pantalla de permisos de Facebook.
 * Se abre en un popup desde el asistente.
 */
export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return popupResponse({ ok: false, error: "Tu sesión venció. Vuelve a entrar." });

  const { data: perfil } = await sb
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!haPagado(perfil)) {
    return popupResponse({ ok: false, error: "Primero hay que pagar el plan." });
  }

  const { data: app } = await sb
    .from("meta_apps")
    .select("app_id, graph_ver, app_secret_enc, config_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  /* Dos caminos:
       - Trajo SU app: se conecta con la de el.
       - No trajo nada: es del camino corto, lo metimos como Evaluador de
         NUESTRA app, y se conecta con esa.
     El segundo es el que no existia, y por eso "Ya la acepté" no llevaba
     a ninguna parte. */
  const propia = app?.app_secret_enc ? app : null;
  const nuestra = propia ? null : appNuestra();

  if (!propia && !nuestra) {
    const falta = faltaDeAppNuestra();
    return popupResponse({
      ok: false,
      error: falta.length
        ? `Falta configurar nuestra app de Meta en el servidor (${falta.join(", ")}). Avísanos.`
        : "Primero guarda tu App ID, o pídenos acceso.",
    });
  }

  const state = crypto.randomBytes(24).toString("hex");
  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(
    authorizeUrl({
      ver: propia ? propia.graph_ver : nuestra!.graphVer,
      appId: propia ? propia.app_id : nuestra!.appId,
      redirectUri: redirectUri(),
      state,
      configId: propia ? propia.config_id : nuestra!.configId,
    }),
  );
}
