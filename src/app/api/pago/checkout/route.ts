import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { precioEnCentavos, PRECIO_USD, enPesos } from "@/lib/precio";
import { enlaceDeCobro, nuevaReferencia } from "@/lib/wompi";
import { secreto } from "@/lib/env";

/**
 * Arranca un cobro: calcula lo que vale hoy, lo apunta, y devuelve el enlace
 * al checkout de Wompi.
 *
 * El monto se calcula AQUI, en el servidor, y se firma. Si se dejara que lo
 * mandara el navegador, cualquiera pagaria mil pesos por el mes.
 */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Entra a tu cuenta" }, { status: 401 });

  let sb;
  try {
    sb = supabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear el cliente admin";
    console.error(`pago/checkout: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { amountInCents, trm, fuente, pesos } = await precioEnCentavos();
  const referencia = nuevaReferencia(user.id);

  // Se apunta ANTES de mandar a nadie a pagar. Si el aviso de Wompi llega y no
  // hay fila que actualizar, no se sabe de quien era el pago: la referencia es
  // lo unico que los une.
  const { error } = await sb.from("payments").insert({
    user_id: user.id,
    reference: referencia,
    amount_in_cents: amountInCents,
    currency: "COP",
    usd: PRECIO_USD,
    trm,
    status: "PENDING",
  });
  if (error) {
    console.error("pago/checkout: no se pudo apuntar el pago:", error.message);
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  }

  const base = (secreto("NEXT_PUBLIC_APP_URL") ?? "https://multipost.asuarezdev.workers.dev")
    .replace(/\/$/, "");

  let url: string;
  try {
    url = await enlaceDeCobro({
      referencia,
      amountInCents,
      redirectUrl: `${base}/panel/pago`,
      correo: user.email,
      // Media hora para pagar. Sin tope, un enlace de hace un mes seguiria
      // cobrando el precio de hace un mes, y el dolar se mueve.
      expiraEn: new Date(Date.now() + 30 * 60 * 1000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falta configurar Wompi";
    console.error(`pago/checkout: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    url,
    referencia,
    usd: PRECIO_USD,
    pesos,
    trm,
    fuente,
    texto: enPesos(amountInCents),
  });
}
