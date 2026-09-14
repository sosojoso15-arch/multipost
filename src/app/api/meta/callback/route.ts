import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/crypto";
import {
  exchangeCodeForToken,
  exchangeLongLivedToken,
  discoverAccounts,
  MetaError,
} from "@/lib/meta";
import { STATE_COOKIE, redirectUri, popupResponse } from "@/lib/metaOauth";
import { appNuestra } from "@/lib/appNuestra";

export const maxDuration = 120;

/**
 * Aterrizaje del permiso de Facebook.
 * Cambia el ?code= por un token largo, trae las paginas y las guarda cifradas.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const store = await cookies();

  const esperado = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);

  // El cliente le dio "Cancelar" en Facebook
  if (sp.get("error")) {
    return popupResponse({
      ok: false,
      error: sp.get("error_description") ?? "Cancelaste el permiso en Facebook.",
    });
  }

  const code = sp.get("code");
  const state = sp.get("state");

  if (!code || !state || !esperado || state !== esperado) {
    return popupResponse({ ok: false, error: "La conexión no coincide. Intenta de nuevo." });
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return popupResponse({ ok: false, error: "Tu sesión venció. Vuelve a entrar." });

  const { data: app } = await sb
    .from("meta_apps")
    .select("id, app_id, graph_ver, app_secret_enc")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const propia = app?.app_secret_enc ? app : null;
  const nuestra = propia ? null : appNuestra();

  if (!propia && !nuestra) {
    return popupResponse({ ok: false, error: "No hay con qué conectarte. Avísanos." });
  }

  /* De quien es la app con la que se esta conectando. Todo lo de abajo usa
     esto, sin importar por cual de los dos caminos llego. */
  const appId = propia ? propia.app_id : nuestra!.appId;
  const graphVer = propia ? propia.graph_ver : nuestra!.graphVer;

  try {
    const secret = propia ? decrypt(propia.app_secret_enc!) : nuestra!.appSecret;

    const corto = await exchangeCodeForToken({
      ver: graphVer,
      appId,
      appSecret: secret,
      redirectUri: redirectUri(),
      code,
    });

    // Token de 60 dias. Los tokens de pagina que salgan de aqui no caducan.
    const { token: largo } = await exchangeLongLivedToken(graphVer, appId, secret, corto);

    const found = await discoverAccounts(graphVer, largo);

    if (found.length === 0) {
      return popupResponse({
        ok: false,
        error:
          "No apareció ninguna página. Vuelve a intentar y marca tus páginas en la pantalla de Facebook.",
      });
    }

    /* `accounts` cuelga de una fila de `meta_apps`, que es de donde sale la
       version de la API al publicar. Quien llego por el camino corto no tiene
       una: se le crea apuntando a NUESTRA app, sin guardar el secreto —ese es
       nuestro y vive en el Worker, no en la base de cada cliente. */
    let metaAppId = propia?.id;

    if (!metaAppId) {
      const { data: creada, error: errApp } = await sb
        .from("meta_apps")
        .upsert(
          {
            user_id: user.id,
            app_id: appId,
            graph_ver: graphVer,
            config_id: nuestra!.configId,
            verified_at: new Date().toISOString(),
          },
          { onConflict: "user_id,app_id" },
        )
        .select("id")
        .single();

      if (errApp || !creada) {
        return popupResponse({
          ok: false,
          error: errApp?.message ?? "No se pudo dejar lista tu conexión.",
        });
      }
      metaAppId = creada.id;
    }

    const { error } = await sb.from("accounts").upsert(
      found.map((a) => ({
        user_id: user.id,
        meta_app_id: metaAppId!,
        platform: a.platform,
        external_id: a.externalId,
        name: a.name,
        picture_url: a.pictureUrl,
        token_enc: encrypt(a.token),
        token_expires_at: null, // token de pagina derivado de uno largo
        is_active: true,
        last_error: null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,platform,external_id" },
    );

    if (error) return popupResponse({ ok: false, error: error.message });

    await sb
      .from("meta_apps")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", metaAppId!);

    return popupResponse({ ok: true, count: found.length });
  } catch (e) {
    return popupResponse({
      ok: false,
      error: e instanceof MetaError ? e.message : "Error hablando con Facebook.",
    });
  }
}
