import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { publish, comentar, MetaError } from "@/lib/meta";

type Media = {
  url: string;
  type: "image" | "video";
  /** Ruta en el bucket. Solo la traen los archivos que subio el cliente. */
  path?: string;
};

/**
 * Cuantos destinos se atienden por ejecucion.
 *
 * Cloudflare corta a las 50 llamadas externas por invocacion en el plan
 * gratis, y cada destino son dos o tres: publicar, comentar, y guardar el
 * resultado. Con treinta paginas se pasa del tope y revientan TODAS, que es
 * lo peor que puede pasar: el cliente no publica en ninguna.
 *
 * Mejor atender una tanda y dejar el resto en la cola: el cron las recoge en
 * menos de cinco minutos y salen igual.
 */
const POR_TANDA = 12;

/**
 * Cuantas veces se reintenta un destino que fallo.
 *
 * Los fallos de Meta a veces son pasajeros —se cayo un momento, tardo de
 * mas— y reintentar los salva. Pero un token muerto falla SIEMPRE: sin este
 * tope volveria a la cola cada cinco minutos, para siempre.
 */
const MAX_INTENTOS = 3;

type Fila = {
  id: string;
  post_id: string;
  account_id: string;
  attempts: number;
  accounts: {
    id: string;
    user_id: string;
    platform: "facebook" | "instagram";
    external_id: string;
    name: string;
    token_enc: string;
    meta_apps: { graph_ver: string } | null;
  } | null;
};

export type ResultadoDestino = {
  ok: boolean;
  name: string;
  error?: string;
  remoteId?: string;
  commentError?: string | null;
};

/**
 * Publica un post en sus destinos.
 *
 * Cada destino es independiente: si una pagina falla, las demas siguen.
 * Sirve igual para "publicar ya" (con la sesion del usuario) y para el
 * cron de programados (con service role).
 */
export async function runPost(sb: SupabaseClient, postId: string) {
  const { data: post, error } = await sb
    .from("posts")
    .select("id, user_id, message, link, media, status, first_comment")
    .eq("id", postId)
    .single();

  if (error || !post) throw new Error("Post no encontrado");

  const media = (post.media ?? []) as Media[];
  const imageUrl = media.find((m) => m.type === "image")?.url ?? null;
  const videoUrl = media.find((m) => m.type === "video")?.url ?? null;

  /* Se marca ANTES de leer los destinos, y sirve de tranca: el cron solo
     recoge los `scheduled`, asi que mientras este en `publishing` no lo
     agarra otra vez. Sin esto, una tanda lenta —un video, que espera hasta
     dos minutos— podia solaparse con la siguiente vuelta del cron y publicar
     el mismo post DOS VECES en la pagina del cliente.

     La fecha se pone tambien aqui para poder rescatarlo si el Worker se
     muere a medias: quedaria en `publishing` para siempre. */
  await sb
    .from("posts")
    .update({ status: "publishing", scheduled_at: new Date().toISOString() })
    .eq("id", postId);

  /* `pending`, y los `error` que todavia tengan reintentos.
     Si se pidieran todos los `error`, una pagina con el token muerto volveria
     a la cola, fallaria, volveria… cada cinco minutos para siempre. */
  const { data: targets } = await sb
    .from("post_targets")
    .select(
      "id, post_id, account_id, attempts, accounts(id, user_id, platform, external_id, name, token_enc, meta_apps(graph_ver))",
    )
    .eq("post_id", postId)
    .or(`status.eq.pending,and(status.eq.error,attempts.lt.${MAX_INTENTOS})`);

  const pendientes = (targets ?? []) as unknown as Fila[];
  const tanda = pendientes.slice(0, POR_TANDA);
  const quedan = pendientes.length - tanda.length;

  /* Los resultados se juntan y se guardan de UNA. Antes era un `update` por
     destino, y esas tambien cuentan contra el tope de llamadas: con treinta
     paginas, treinta llamadas desperdiciadas en guardar. */
  const filasAGuardar: Record<string, unknown>[] = [];

  const results: ResultadoDestino[] = await Promise.all(
    tanda.map(async (t): Promise<ResultadoDestino> => {
      const acc = t.accounts;
      if (!acc) return { ok: false, name: "?" };

      const base = {
        id: t.id,
        post_id: t.post_id,
        account_id: t.account_id,
        attempts: t.attempts + 1,
        completed_at: new Date().toISOString(),
      };

      // Segunda reja. El cron corre con service role y se salta el RLS,
      // asi que aqui comprobamos a mano que la cuenta sea del dueno del post.
      if (acc.user_id !== post.user_id) {
        filasAGuardar.push({
          ...base,
          status: "error",
          error_msg: "Esa cuenta no pertenece al dueño del post",
        });
        return { ok: false, name: acc.name, error: "cuenta ajena" };
      }

      const ver = acc.meta_apps?.graph_ver ?? "v23.0";

      try {
        const token = decrypt(acc.token_enc);

        const remoteId = await publish(acc.platform, ver, acc.external_id, token, {
          message: post.message,
          link: post.link,
          imageUrl,
          videoUrl,
        });

        // El primer comentario va aparte. Si falla, el post NO falla:
        // ya salio publicado y eso es lo que importa.
        let commentId: string | null = null;
        let commentError: string | null = null;

        if (post.first_comment?.trim()) {
          try {
            commentId = await comentar(ver, remoteId, token, post.first_comment.trim());
          } catch (e) {
            commentError = e instanceof Error ? e.message : "No se pudo comentar";
          }
        }

        filasAGuardar.push({
          ...base,
          status: "ok",
          remote_id: remoteId,
          error_code: null,
          error_msg: null,
          comment_id: commentId,
          comment_error: commentError,
        });

        return { ok: true, name: acc.name, remoteId, commentError };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Fallo desconocido";
        const code = e instanceof MetaError ? e.code : undefined;

        filasAGuardar.push({
          ...base,
          status: "error",
          error_code: code ?? null,
          error_msg: msg,
        });

        // Token muerto o permiso revocado: se marca la cuenta para que el
        // cliente sepa que tiene que volver a conectar.
        if (code === 190 || code === 200 || code === 10) {
          await sb.from("accounts").update({ last_error: msg }).eq("id", acc.id);
        }

        return { ok: false, name: acc.name, error: msg };
      }
    }),
  );

  if (filasAGuardar.length > 0) {
    await sb.from("post_targets").upsert(filasAGuardar, { onConflict: "id" });
  }

  const okCount = results.filter((r) => r.ok).length;

  if (quedan > 0) {
    /* Se vuelve a poner en cola en vez de darlo por terminado. El cron mira
       los `scheduled` con la hora ya pasada, asi que con `now()` lo recoge en
       la siguiente vuelta, dentro de cinco minutos como mucho. */
    await sb
      .from("posts")
      .update({ status: "scheduled", scheduled_at: new Date().toISOString() })
      .eq("id", postId);

    return { total: results.length, ok: okCount, results, quedan };
  }

  await sb
    .from("posts")
    .update({
      status: okCount > 0 ? "done" : "failed",
      published_at: new Date().toISOString(),
    })
    .eq("id", postId);

  // Meta ya se bajo la imagen y la guarda en SUS servidores, asi que el
  // archivo nuestro ya no hace falta. Se borra para no acumular espacio.
  //
  // Solo si TODO salio bien: si algun destino fallo, el cliente puede querer
  // reintentar, y sin el archivo no habria con que.
  if (okCount === results.length) {
    await borrarMedia(sb, media, postId);
  }

  return { total: results.length, ok: okCount, results, quedan: 0 };
}

/** Saca del bucket los archivos que subio el cliente para este post. */
async function borrarMedia(sb: SupabaseClient, media: Media[], postId: string) {
  const rutas = media.map((m) => m.path).filter((p): p is string => Boolean(p));
  if (rutas.length === 0) return;

  const { error } = await sb.storage.from("media").remove(rutas);

  if (error) {
    // Que falle el borrado no daña la publicacion, que ya salio bien.
    console.error(`No se pudo borrar la media del post ${postId}: ${error.message}`);
    return;
  }

  // Se deja la URL en el historial por referencia, pero se marca que el
  // archivo ya no existe, para que nadie intente reusarlo.
  await sb
    .from("posts")
    .update({ media: media.map((m) => ({ ...m, path: null, borrado: true })) })
    .eq("id", postId);
}
