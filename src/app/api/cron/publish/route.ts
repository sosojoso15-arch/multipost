import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runPost } from "@/lib/publisher";
import { secreto } from "@/lib/env";

export const maxDuration = 300;

/** Vercel Cron. Publica los posts programados que ya les llego la hora. */
export async function GET(req: Request) {
  const esperado = secreto("CRON_SECRET");
  const auth = req.headers.get("authorization");
  if (!esperado || auth !== `Bearer ${esperado}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let sb;
  try {
    sb = supabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear el cliente admin";
    console.error(`cron: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const ahora = new Date();

  /* Los que les llego la hora. */
  const { data: aLaHora } = await sb
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", ahora.toISOString())
    /* Pocos por vuelta, y a proposito.

       Cada post puede gastar decenas de llamadas externas, y Cloudflare
       corta a las 50 por ejecucion. Atender veinte de un golpe garantiza
       pasarse del tope y que fallen todos. Con tres, y una vuelta cada
       cinco minutos, salen igual sin reventar. */
    .limit(3);

  /* Y los que se quedaron trancados.

     `publishing` sirve de tranca para que dos vueltas no publiquen lo mismo,
     pero si el Worker se muere a media tanda el post se queda ahi para
     siempre. Diez minutos es de sobra para cualquier tanda —lo mas lento es
     un video, que espera dos— asi que pasado eso se da por muerto y se
     retoma. Los destinos ya publicados quedaron en `ok`, no se repiten. */
  const trancado = new Date(ahora.getTime() - 10 * 60 * 1000).toISOString();

  const { data: colgados } = await sb
    .from("posts")
    .select("id")
    .eq("status", "publishing")
    .lte("scheduled_at", trancado)
    .limit(2);

  const due = [...(aLaHora ?? []), ...(colgados ?? [])];

  const ids = due.map((p) => p.id);
  const done: { id: string; ok: number; total: number }[] = [];

  for (const id of ids) {
    try {
      const r = await runPost(sb, id);
      done.push({ id, ok: r.ok, total: r.total });
    } catch {
      await sb.from("posts").update({ status: "failed" }).eq("id", id);
    }
  }

  return NextResponse.json({ procesados: done.length, done });
}
