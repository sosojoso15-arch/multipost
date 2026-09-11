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
 * Publica un post en todos sus destinos.
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

  await sb.from("posts").update({ status: "publishing" }).eq("id", postId);

  const media = (post.media ?? []) as Media[];
  const imageUrl = media.find((m) => m.type === "image")?.url ?? null;
  const videoUrl = media.find((m) => m.type === "video")?.url ?? null;

  const { data: targets } = await sb
    .from("post_targets")
    .select(
      "id, attempts, accounts(id, user_id, platform, external_id, name, token_enc, meta_apps(graph_ver))",
    )
    .eq("post_id", postId)
    .in("status", ["pending", "error"]);

  type Row = {
    id: string;
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

  const rows = (targets ?? []) as unknown as Row[];

  const results = await Promise.all(
    rows.map(async (t) => {
      const acc = t.accounts;
      if (!acc) return { ok: false, name: "?" };

      // Segunda reja. El cron corre con service role y se salta el RLS,
      // asi que aqui comprobamos a mano que la cuenta sea del dueno del post.
      if (acc.user_id !== post.user_id) {
        await sb
          .from("post_targets")
          .update({
            status: "error",
            error_msg: "Esa cuenta no pertenece al dueño del post",
            attempts: t.attempts + 1,
            completed_at: new Date().toISOString(),
          })
          .eq("id", t.id);
        return { ok: false, name: acc.name, error: "cuenta ajena" };
      }

      try {
        const remoteId = await publish(
          acc.platform,
          acc.meta_apps?.graph_ver ?? "v23.0",
          acc.external_id,
          decrypt(acc.token_enc),
          { message: post.message, link: post.link, imageUrl, videoUrl },
        );

        // El primer comentario va aparte. Si falla, el post NO falla:
        // ya salio publicado y eso es lo que importa.
        let commentId: string | null = null;
        let commentError: string | null = null;

        if (post.first_comment?.trim()) {
          try {
            commentId = await comentar(
              acc.meta_apps?.graph_ver ?? "v23.0",
              remoteId,
              decrypt(acc.token_enc),
              post.first_comment.trim(),
            );
          } catch (e) {
            commentError = e instanceof Error ? e.message : "No se pudo comentar";
          }
        }

        await sb
          .from("post_targets")
          .update({
            status: "ok",
            remote_id: remoteId,
            error_code: null,
            error_msg: null,
            comment_id: commentId,
            comment_error: commentError,
            attempts: t.attempts + 1,
            completed_at: new Date().toISOString(),
          })
          .eq("id", t.id);

        return { ok: true, name: acc.name, remoteId, commentError };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Fallo desconocido";
        const code = e instanceof MetaError ? e.code : undefined;

        await sb
          .from("post_targets")
          .update({
            status: "error",
            error_code: code ?? null,
            error_msg: msg,
            attempts: t.attempts + 1,
            completed_at: new Date().toISOString(),
          })
          .eq("id", t.id);

        // Token muerto o permiso revocado: marcamos la cuenta para que el
        // usuario sepa que tiene que volver a conectar.
        if (code === 190 || code === 200 || code === 10) {
          await sb.from("accounts").update({ last_error: msg }).eq("id", acc.id);
        }

        return { ok: false, name: acc.name, error: msg };
      }
    }),
  );

  const okCount = results.filter((r) => r.ok).length;

  await sb
    .from("posts")
    .update({
      status: okCount === results.length ? "done" : okCount > 0 ? "done" : "failed",
      published_at: new Date().toISOString(),
    })
    .eq("id", postId);

  // Meta ya se bajo la imagen y la guarda en SUS servidores, asi que el
  // archivo nuestro ya no hace falta. Lo borramos para no acumular espacio.
  //
  // Si algun destino fallo NO borramos: el cliente puede querer reintentar,
  // y sin el archivo no habria con que.
  if (okCount === results.length) {
    await borrarMedia(sb, media, postId);
  }

  return { total: results.length, ok: okCount, results };
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

  // Dejamos la URL en el historial por referencia, pero marcamos que el
  // archivo ya no existe, para que nadie intente reusarlo.
  await sb
    .from("posts")
    .update({ media: media.map((m) => ({ ...m, path: null, borrado: true })) })
    .eq("id", postId);
}
