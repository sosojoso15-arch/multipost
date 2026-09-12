import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/admin";
import { mandarCorreo, mensajeInvitado } from "@/lib/correo";
import { secreto } from "@/lib/env";
import { listarSolicitudes } from "@/lib/testers";

/** Comprueba que quien llama sea el dueno. Devuelve el correo o null. */
async function soyElDueno(): Promise<string | null> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return esAdmin(user?.email) ? (user!.email ?? null) : null;
}

/** La lista de solicitudes, con el correo de cada quien para poder avisarle. */
export async function GET() {
  if (!(await soyElDueno())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const r = await listarSolicitudes();
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ solicitudes: r.filas });
}

/** Marcar una como lista (o rechazada), y avisarle al cliente. */
export async function PATCH(req: Request) {
  if (!(await soyElDueno())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, estado, nota } = (await req.json()) as {
    id?: string;
    estado?: string;
    nota?: string;
  };

  if (!id || !estado || !["pendiente", "listo", "rechazado"].includes(estado)) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: fila, error } = await admin
    .from("tester_requests")
    .update({ estado, nota: nota ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, user_id, correo_aviso")
    .single();

  if (error || !fila) {
    return NextResponse.json({ error: error?.message ?? "No se encontró" }, { status: 500 });
  }

  // Solo se avisa cuando queda LISTO. Un rechazo se habla, no se manda en un
  // correo automatico.
  if (estado !== "listo") {
    return NextResponse.json({ ok: true, correoEnviado: false });
  }

  // Si dejo un correo aparte, ese manda: puede que el de su cuenta no lo mire.
  const { data: u } = await admin.auth.admin.getUserById(fila.user_id);
  const para = fila.correo_aviso || u?.user?.email;
  const appUrl = secreto("NEXT_PUBLIC_APP_URL") ?? "https://multipost.asuarezdev.workers.dev";
  const cuerpo = mensajeInvitado(appUrl);

  if (!para) {
    return NextResponse.json({ ok: true, correoEnviado: false, motivo: "sin correo", cuerpo });
  }

  const envio = await mandarCorreo({
    para,
    asunto: "Ya tienes acceso a Multi-Post — falta que aceptes la invitación",
    cuerpo,
  });

  if (envio.ok) {
    await admin
      .from("tester_requests")
      .update({ avisado_at: new Date().toISOString() })
      .eq("id", id);
  }

  // Si no se pudo mandar, se devuelve el texto para copiarlo a mano. Asi el
  // flujo sirve igual sin servicio de correo contratado.
  return NextResponse.json({
    ok: true,
    correoEnviado: envio.ok,
    motivo: envio.motivo,
    para,
    cuerpo,
  });
}
