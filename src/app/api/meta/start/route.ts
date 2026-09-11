import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { authorizeUrl } from "@/lib/meta";
import { STATE_COOKIE, redirectUri, popupResponse } from "@/lib/metaOauth";

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

  const { data: app } = await sb
    .from("meta_apps")
    .select("app_id, graph_ver, app_secret_enc, config_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!app) {
    return popupResponse({ ok: false, error: "Primero guarda tu App ID." });
  }
  if (!app.app_secret_enc) {
    return popupResponse({ ok: false, error: "Falta el App Secret de tu app." });
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
      ver: app.graph_ver,
      appId: app.app_id,
      redirectUri: redirectUri(),
      state,
      configId: app.config_id,
    }),
  );
}
