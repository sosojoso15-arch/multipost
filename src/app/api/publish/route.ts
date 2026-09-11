import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { runPost } from "@/lib/publisher";
import { limitePosts } from "@/lib/plans";

export const maxDuration = 300;

type Body = {
  message?: string;
  link?: string;
  media?: { url: string; type: "image" | "video"; path?: string }[];
  firstComment?: string;
  accountIds: string[];
  scheduledAt?: string | null;
};

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json()) as Body;
  const accountIds = body.accountIds ?? [];
  const media = body.media ?? [];

  if (accountIds.length === 0) {
    return NextResponse.json({ error: "Elige al menos una cuenta" }, { status: 400 });
  }
  if (!body.message?.trim() && media.length === 0 && !body.link?.trim()) {
    return NextResponse.json({ error: "El post esta vacio" }, { status: 400 });
  }

  // El `path` termina en un borrado cuando la publicacion sale bien. Si alguien
  // mandara la ruta de otro cliente, le borrariamos el archivo. Cortamos aqui.
  const ajeno = media.find((m) => m.path && !m.path.startsWith(`${user.id}/`));
  if (ajeno) {
    return NextResponse.json({ error: "Ese archivo no es tuyo." }, { status: 403 });
  }

  // Esta consulta va bajo RLS: solo devuelve las cuentas de ESTE usuario.
  // Si falta alguna de las pedidas, es que no le pertenece. Cortamos aqui.
  const { data: chosen } = await sb
    .from("accounts")
    .select("id, platform, name")
    .in("id", accountIds);

  const propias = new Set((chosen ?? []).map((a) => a.id));
  if (propias.size !== new Set(accountIds).size) {
    return NextResponse.json(
      { error: "Alguna de esas cuentas no es tuya." },
      { status: 403 },
    );
  }

  // Instagram no admite texto solo
  const igSinMedia = (chosen ?? []).filter((a) => a.platform === "instagram" && media.length === 0);
  if (igSinMedia.length > 0) {
    return NextResponse.json(
      {
        error: `Instagram exige imagen o video. Quita estas cuentas o agrega media: ${igSinMedia
          .map((a) => a.name)
          .join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Limite del plan
  const { data: profile } = await sb
    .from("profiles")
    .select("plan, posts_used, period_start")
    .eq("id", user.id)
    .single();

  if (profile) {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const nuevoPeriodo = new Date(profile.period_start) < inicioMes;
    const usados = nuevoPeriodo ? 0 : profile.posts_used;
    const limite = limitePosts(profile.plan);

    if (usados + accountIds.length > limite) {
      return NextResponse.json(
        { error: `Llegaste al limite de tu plan (${limite} publicaciones al mes).` },
        { status: 402 },
      );
    }

    await sb
      .from("profiles")
      .update({
        posts_used: usados + accountIds.length,
        period_start: inicioMes.toISOString().slice(0, 10),
      })
      .eq("id", user.id);
  }

  const programado = Boolean(body.scheduledAt);

  const { data: post, error: postErr } = await sb
    .from("posts")
    .insert({
      user_id: user.id,
      message: body.message?.trim() || null,
      link: body.link?.trim() || null,
      first_comment: body.firstComment?.trim() || null,
      media,
      status: programado ? "scheduled" : "publishing",
      scheduled_at: body.scheduledAt ?? null,
    })
    .select("id")
    .single();

  if (postErr || !post) {
    return NextResponse.json({ error: postErr?.message ?? "No se pudo crear" }, { status: 500 });
  }

  const { error: tErr } = await sb
    .from("post_targets")
    .insert(accountIds.map((account_id) => ({ post_id: post.id, account_id })));

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  if (programado) {
    return NextResponse.json({ postId: post.id, scheduled: true });
  }

  const result = await runPost(sb, post.id);
  return NextResponse.json({ postId: post.id, ...result });
}
