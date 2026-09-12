import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { haPagado } from "@/lib/plans";

/**
 * El cliente pide acceso: nos deja su usuario de Facebook y espera a que
 * el dueno lo meta como Tester de la app.
 *
 * Es el camino corto. El largo —crear su propia app de Meta— sigue ahi
 * para quien lo prefiera o para cuando se llene el cupo de testers.
 */

/** Cobrar antes de dar acceso. La pantalla ya lo bloquea, pero eso se salta
 *  con una peticion a mano: la reja de verdad va aqui. */
async function tienePlan(sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string) {
  const { data } = await sb
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", userId)
    .maybeSingle();
  return haPagado(data);
}

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (!(await tienePlan(sb, user.id))) {
    return NextResponse.json(
      { error: "Primero hay que pagar el plan." },
      { status: 402 },
    );
  }

  const { facebookRef, nombreFb, pista, correoAviso } = (await req.json()) as {
    facebookRef?: string;
    nombreFb?: string;
    pista?: string;
    correoAviso?: string;
  };
  const ref = facebookRef?.trim();

  if (!ref || ref.length < 3) {
    return NextResponse.json(
      { error: "Escribe tu nombre de usuario de Facebook." },
      { status: 400 },
    );
  }

  // Meta NO resuelve correos ni nombres con espacios en la caja de roles:
  // devuelve "does not resolve to a valid user ID". Solo sirve el nombre de
  // usuario o el ID numerico. Mejor cortarlo aqui que hacerle perder el
  // viaje al dueno cuando vaya a invitarlo.
  if (ref.includes("@")) {
    return NextResponse.json(
      {
        error:
          "Eso es un correo, y Facebook no lo acepta ahí. Necesitamos tu nombre de usuario: " +
          "el que sale al final de la dirección de tu perfil, facebook.com/TU.USUARIO",
      },
      { status: 400 },
    );
  }
  if (/\s/.test(ref)) {
    return NextResponse.json(
      {
        error:
          "El nombre de usuario va sin espacios. Míralo al final de la dirección de tu perfil, " +
          "facebook.com/TU.USUARIO",
      },
      { status: 400 },
    );
  }
  if (ref.length > 160) {
    return NextResponse.json({ error: "Eso es demasiado largo." }, { status: 400 });
  }

  // Obligatorio: sin el nombre, el buscador de Meta devuelve varias cuentas
  // parecidas y se puede invitar a la equivocada.
  const nombre = nombreFb?.trim();
  if (!nombre || nombre.length < 2) {
    return NextResponse.json(
      { error: "Escribe tu nombre tal como aparece en Facebook." },
      { status: 400 },
    );
  }
  if (nombre.length > 120) {
    return NextResponse.json({ error: "Ese nombre es demasiado largo." }, { status: 400 });
  }

  // Obligatorio: es por donde le avisamos cuando el acceso este listo.
  const aviso = correoAviso?.trim();
  if (!aviso) {
    return NextResponse.json(
      { error: "Escribe el correo donde quieres que te avisemos." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(aviso)) {
    return NextResponse.json({ error: "Ese correo no se ve bien escrito." }, { status: 400 });
  }

  // Tope generoso pero tope: es un campo libre que escribe cualquiera.
  const laPista = pista?.trim().slice(0, 500) || null;

  // upsert y no insert: pedir dos veces corrige el dato en vez de fallar.
  // El estado NO se toca aqui, para no revivir una ya resuelta.
  const { error } = await sb
    .from("tester_requests")
    .upsert(
      {
        user_id: user.id,
        facebook_ref: ref,
        nombre_fb: nombre,
        pista: laPista,
        correo_aviso: aviso,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
