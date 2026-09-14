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

  const { data: due } = await sb
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    /* Pocos por vuelta, y a proposito.

       Cada post puede gastar decenas de llamadas externas, y Cloudflare
       corta a las 50 por ejecucion. Atender veinte de un golpe garantiza
       pasarse del tope y que fallen todos. Con tres, y una vuelta cada
       cinco minutos, salen igual sin reventar. */
    .limit(3);

  const ids = (due ?? []).map((p) => p.id);
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
