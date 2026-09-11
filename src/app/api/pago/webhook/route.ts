import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { eventoEsDeWompi, type EventoWompi } from "@/lib/wompi";
import { DIAS_PLAN } from "@/lib/precio";

export const maxDuration = 60;

/**
 * El aviso de Wompi cuando un pago llega a su estado final.
 *
 * Tres cosas que hay que hacer bien aqui, y las tres se hacen mal a menudo:
 *
 *  1. COMPROBAR LA FIRMA. Sin eso, cualquiera que sepa esta direccion manda un
 *     "APPROVED" inventado y se regala un mes.
 *
 *  2. NO FIARSE DEL MONTO QUE VIENE. Se compara con el que se apunto al crear
 *     el cobro. Si no cuadra, no se da nada.
 *
 *  3. AGUANTAR REPETIDOS. Wompi reintenta a los 30 min, 3 h y 24 h. El mismo
 *     aviso puede llegar cuatro veces y NO puede regalar cuatro meses.
 *
 * Y siempre se responde 200, incluso cuando se rechaza: un 500 hace que Wompi
 * reintente eternamente algo que nunca va a funcionar.
 */
export async function POST(req: Request) {
  let ev: EventoWompi;
  try {
    ev = (await req.json()) as EventoWompi;
  } catch {
    return NextResponse.json({ ok: false, motivo: "cuerpo ilegible" });
  }

  if (!(await eventoEsDeWompi(ev))) {
    console.error("pago/webhook: firma invalida, se ignora");
    return NextResponse.json({ ok: false, motivo: "firma invalida" });
  }

  const t = ev?.data?.transaction;
  const referencia = t?.reference;
  if (!referencia) return NextResponse.json({ ok: false, motivo: "sin referencia" });

  let sb;
  try {
    sb = supabaseAdmin();
  } catch (e) {
    // Aqui SI conviene el 500: el fallo es nuestro y pasajero, y queremos que
    // Wompi lo vuelva a mandar.
    console.error("pago/webhook:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const { data: pago } = await sb
    .from("payments")
    .select("id, user_id, amount_in_cents, status")
    .eq("reference", referencia)
    .maybeSingle();

  if (!pago) {
    console.error(`pago/webhook: referencia desconocida ${referencia}`);
    return NextResponse.json({ ok: false, motivo: "referencia desconocida" });
  }

  // Ya estaba resuelto: es un reintento. Se responde bien y no se toca nada.
  if (pago.status !== "PENDING") {
    return NextResponse.json({ ok: true, repetido: true });
  }

  const estado = t?.status ?? "ERROR";
  const montoDicho = Number(t?.amount_in_cents);
  const cuadra = Number.isFinite(montoDicho) && montoDicho === Number(pago.amount_in_cents);

  if (estado === "APPROVED" && !cuadra) {
    console.error(
      `pago/webhook: el monto no cuadra en ${referencia} — dice ${montoDicho}, se cobro ${pago.amount_in_cents}`,
    );
    await sb
      .from("payments")
      .update({ status: "ERROR", payload: ev, transaction_id: t?.id, updated_at: new Date().toISOString() })
      .eq("id", pago.id);
    return NextResponse.json({ ok: false, motivo: "monto distinto" });
  }

  await sb
    .from("payments")
    .update({
      status: estado,
      transaction_id: t?.id ?? null,
      payload: ev,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pago.id);

  if (estado !== "APPROVED") {
    return NextResponse.json({ ok: true, estado });
  }

  // Pagado. Se le da el mes.
  //
  // Si todavia le quedaba plan, el mes nuevo se SUMA al que le quedaba en vez
  // de pisarlo: quien paga antes de que se le venza no puede perder los dias
  // que ya habia pagado.
  const { data: perfil } = await sb
    .from("profiles")
    .select("plan_expires_at")
    .eq("id", pago.user_id)
    .maybeSingle();

  const ahora = Date.now();
  const previo = perfil?.plan_expires_at ? new Date(perfil.plan_expires_at).getTime() : 0;
  const desde = previo > ahora ? previo : ahora;
  const hasta = new Date(desde + DIAS_PLAN * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await sb
    .from("profiles")
    .update({ plan: "pro", plan_expires_at: hasta })
    .eq("id", pago.user_id);

  if (error) {
    // El pago entro pero no se pudo dar el plan. Esto SI tiene que reintentarse.
    console.error(`pago/webhook: cobrado pero sin plan para ${pago.user_id}: ${error.message}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, estado, hasta });
}

/**
 * Wompi (y cualquier panel de webhooks) suele tocar la URL con GET antes de
 * dejarte guardarla. Sin esto respondemos 405 y el panel dice que no pudo
 * guardar, sin explicar por que.
 *
 * No hace nada y no revela nada: solo confirma que la puerta existe.
 */
export function GET() {
  return Response.json({ ok: true, servicio: "webhook de pagos" });
}
