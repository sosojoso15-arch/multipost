import type { SupabaseClient } from "@supabase/supabase-js";
import { encrypt } from "@/lib/crypto";
import { discoverAccounts, exchangeLongLivedToken } from "@/lib/meta";

/**
 * Con un token de usuario en la mano: trae sus paginas y las guarda.
 *
 * Esta parte es la misma llegue por donde llegue —por la vuelta de OAuth o
 * por el SDK en el telefono—, asi que vive aqui y no repetida en cada ruta.
 */
export async function guardarCuentas(opts: {
  sb: SupabaseClient;
  userId: string;
  /** Token de usuario, corto o largo. Se alarga igual, que no sobra. */
  token: string;
  appId: string;
  appSecret: string;
  graphVer: string;
  configId: string | null;
  /** La fila de meta_apps, si el cliente ya tiene una suya. */
  metaAppIdPropia?: string | null;
}): Promise<{ ok: true; cuentas: number } | { ok: false; error: string }> {
  const { sb, userId, appId, appSecret, graphVer, configId } = opts;

  // Un token de pagina que salga de uno largo no caduca. El paso sobra si ya
  // venia largo, pero es barato y asegura que las programadas sigan sirviendo.
  const { token: largo } = await exchangeLongLivedToken(graphVer, appId, appSecret, opts.token);

  const found = await discoverAccounts(graphVer, largo);

  if (found.length === 0) {
    return {
      ok: false,
      error:
        "No apareció ninguna página. Vuelve a intentar y marca tus páginas en la pantalla de Facebook.",
    };
  }

  /* `accounts` cuelga de una fila de `meta_apps`, que es de donde sale la
     version de la API al publicar. Quien llego por el camino corto no tiene
     una: se le crea apuntando a NUESTRA app, sin guardar el secreto —ese es
     nuestro y vive en el Worker, no en la base de cada cliente. */
  let metaAppId = opts.metaAppIdPropia ?? null;

  if (!metaAppId) {
    const { data: creada, error } = await sb
      .from("meta_apps")
      .upsert(
        {
          user_id: userId,
          app_id: appId,
          graph_ver: graphVer,
          config_id: configId,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id,app_id" },
      )
      .select("id")
      .single();

    if (error || !creada) {
      return { ok: false, error: error?.message ?? "No se pudo dejar lista tu conexión." };
    }
    metaAppId = creada.id;
  }

  const { error } = await sb.from("accounts").upsert(
    found.map((a) => ({
      user_id: userId,
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

  if (error) return { ok: false, error: error.message };

  await sb
    .from("meta_apps")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", metaAppId!);

  return { ok: true, cuentas: found.length };
}
