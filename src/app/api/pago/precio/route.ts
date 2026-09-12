import { NextResponse } from "next/server";
import { precioEnCentavos, enPesos, precioUsd } from "@/lib/precio";

/**
 * Cuanto cuesta hoy, para poder MOSTRARLO antes de que nadie haga clic.
 *
 * Va aparte de /api/pago/checkout a proposito: ese apunta un pago pendiente
 * en la base, y seria absurdo crear uno cada vez que alguien abre el panel.
 * Aqui no se escribe nada.
 *
 * Hace falta porque Wompi solo cobra en PESOS: el cliente ve "45 USD" en
 * nuestra pantalla y aterriza en una de Wompi que dice $139.545. Si no se lo
 * explicamos antes, parece otro precio.
 */
export async function GET() {
  try {
    const { amountInCents, trm, fuente } = await precioEnCentavos();

    return NextResponse.json({
      usd: precioUsd(),
      pesos: enPesos(amountInCents),
      trm,
      fuente,
    });
  } catch {
    // Que no se pueda calcular no debe romper el panel: se muestra solo el
    // precio en dolares y ya.
    return NextResponse.json({ usd: precioUsd() }, { status: 200 });
  }
}
