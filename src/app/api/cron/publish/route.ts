import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runPost } from "@/lib/publisher";

export const maxDuration = 300;

/** Vercel Cron. Publica los posts programados que ya les llego la hora. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  const { data: due } = await sb
    .from("posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(20);

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
